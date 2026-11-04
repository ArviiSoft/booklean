import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { ResizableImage, DEFAULT_IMAGE_WIDTH } from "./ResizableImage";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  ChevronDown,
  ChevronUp,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  MessageSquare,
  Search,
} from "lucide-react";
import type { Chapter, Library } from "../types";
import {
  Footnote,
  SearchHighlight,
  searchKey,
  findMatches,
  Superscript,
  Subscript,
  ParagraphLayout,
} from "../editorExtensions";
import { fmt, chapterWords } from "../model";
import EditorToolbar, { Tool } from "./EditorToolbar";
import { Modal, Field } from "./UI";
export default function WritingCanvas({
  chapter,
  index,
  preferences,
  onUpdate,
  onHelp,
  notify,
}: {
  chapter: Chapter;
  index: number;
  preferences: Library["preferences"];
  onUpdate: (patch: Partial<Chapter>) => void;
  onHelp: () => void;
  notify: (s: string) => void;
}) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const savedSelection = useRef<{ from: number; to: number } | null>(null);
  const editor = useEditor(
    {
      shouldRerenderOnTransaction: false,
      extensions: [
        StarterKit.configure({
          link: { openOnClick: false },
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        Placeholder.configure({
          placeholder: "İlk cümleniz, yeni bir dünyanın kapısı…",
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        ResizableImage,
        Highlight.configure({ multicolor: true }),
        TextStyleKit.configure({ lineHeight: false, backgroundColor: false }),
        Superscript,
        Subscript,
        ParagraphLayout,
        Footnote,
        SearchHighlight,
      ],
      content: chapter.html,
      editorProps: {
        attributes: {
          class: "manuscript-editor",
          "aria-label": "Bölüm metni",
          spellcheck: "true",
          lang: "tr",
        },
      },
      onUpdate: ({ editor }) => {
        callback.current({ html: editor.getHTML() });
        setRevision((v) => v + 1);
      },
      onSelectionUpdate: () => setRevision((v) => v + 1),
    },
    [chapter.id],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(
      editor.state.tr.setMeta(searchKey, {
        query: search ? query : "",
        index: matchIndex,
      }),
    );
  }, [editor, query, matchIndex, search]);
  const doc = editor?.state.doc;
  const matches = useMemo(
    () => (doc && search ? findMatches(doc, query) : []),
    [doc, query, search],
  );
  const characters = useMemo(() => doc?.textContent.length || 0, [doc]);
  if (!editor) return null;
  const count = chapterWords(chapter);
  const currentIndex = matches.length
    ? Math.min(matchIndex, matches.length - 1)
    : 0;
  function moveMatch(direction: number) {
    const next = (currentIndex + direction + matches.length) % matches.length;
    if (!Number.isFinite(next)) return;
    setMatchIndex(next);
    editor!.chain().setTextSelection(matches[next]).scrollIntoView().run();
  }
  function replace(all = false) {
    if (!matches.length) return;
    let tr = editor!.state.tr;
    const ranges = all ? [...matches].reverse() : [matches[currentIndex]];
    for (const match of ranges)
      tr = tr.insertText(replacement, match.from, match.to);
    editor!.view.dispatch(tr);
    setMatchIndex(0);
  }
  function openNote() {
    if (!editor) return;
    if (editor.state.selection.empty && !editor.isActive("footnote")) {
      notify("Dipnot eklemek için önce bir metin seçin.");
      return;
    }
    if (editor.isActive("footnote"))
      editor.commands.extendMarkRange("footnote");
    savedSelection.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    setNote(editor.getAttributes("footnote").note || "");
  }
  async function image() {
    const position = editor!.state.selection.from;
    try {
      const src = await window.booklean.pickImage();
      if (src && !editor!.isDestroyed) {
        const img = new window.Image();
        img.src = src;
        await img.decode();
        if (editor!.isDestroyed) return;
        const width = Math.min(DEFAULT_IMAGE_WIDTH, img.naturalWidth);
        editor!
          .chain()
          .focus()
          .setTextSelection(Math.min(position, editor!.state.doc.content.size))
          .setImage({
            src,
            width,
            height: Math.round((width * img.naturalHeight) / img.naturalWidth),
          })
          .run();
      }
    } catch (e) {
      notify(String(e));
    }
  }
  function saveNote(remove = false) {
    if (savedSelection.current) {
      const chain = editor!
        .chain()
        .focus()
        .setTextSelection(savedSelection.current);
      if (remove) chain.unsetMark("footnote").run();
      else chain.setMark("footnote", { note: note?.trim() }).run();
    }
    setNote(null);
  }
  const selection = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    " ",
  );
  const selectedWords = selection.trim().match(/\S+/g)?.length || 0;
  return (
    <>
      <div className="toolbar-container">
        <EditorToolbar
          editor={editor}
          onNote={openNote}
          onSearch={() => setSearch((s) => !s)}
          onHelp={onHelp}
          onImage={image}
        />
        {search && (
          <div className="find-bar">
            <Search size={16} />
            <input
              aria-label="Aranan metin"
              placeholder="Bölümde bul…"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setMatchIndex(0);
              }}
            />
            <span>
              {matches.length ? currentIndex + 1 : 0} / {matches.length}
            </span>
            <button
              className="icon-button"
              title="Önceki eşleşme"
              disabled={!matches.length}
              onClick={() => moveMatch(-1)}
            >
              <ChevronUp size={15} />
            </button>
            <button
              className="icon-button"
              title="Sonraki eşleşme"
              disabled={!matches.length}
              onClick={() => moveMatch(1)}
            >
              <ChevronDown size={15} />
            </button>
            <span className="find-divider" />
            <input
              aria-label="Yeni metin"
              placeholder="Şununla değiştir…"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            />
            <button disabled={!matches.length} onClick={() => replace()}>
              Değiştir
            </button>
            <button disabled={!matches.length} onClick={() => replace(true)}>
              Tümü
            </button>
            <button
              className="icon-button"
              title="Aramayı kapat"
              onClick={() => setSearch(false)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="manuscript-scroll">
        <article
          className="manuscript"
          style={
            {
              "--writing-font": preferences.font,
              "--writing-size": `${preferences.fontSize}px`,
              "--writing-line": preferences.lineHeight,
            } as React.CSSProperties
          }
        >
          <div className="chapter-eyebrow">
            <span /> BÖLÜM {String(index + 1).padStart(2, "0")}
            <div />
            <span className={`chapter-state ${chapter.status}`}>
              {chapter.status === "done" ? "Tamamlandı" : "Taslak"}
            </span>
          </div>
          <input
            className="chapter-title-input"
            aria-label="Bölüm adı"
            maxLength={150}
            placeholder="Bölüm adı"
            value={chapter.title === "Adsız bölüm" ? "" : chapter.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
          <div className="chapter-title-divider" />
          <EditorContent editor={editor} />
          <div className="manuscript-end">
            <span />
            <span>✦</span>
            <span />
          </div>
        </article>
      </div>
      <footer className="editor-statusbar">
        <span>
          <span className="status-dot" />{" "}
          {selectedWords
            ? `${fmt(selectedWords)} kelime seçili`
            : `${fmt(count)} kelime`}
          <i>·</i>
          {fmt(characters)} karakter<i>·</i>
          {Math.max(1, Math.ceil(count / 200))} dk okuma
        </span>
        <span>
          Türkçe <i>·</i> {preferences.fontSize} px <i>·</i>{" "}
          <span className="quiet">Bir kelime daha.</span>
        </span>
      </footer>
      <BubbleMenu
        editor={editor}
        options={{ placement: "top", offset: 12 }}
        shouldShow={({ editor, state }) =>
          !editor.isActive("image") &&
          !state.selection.empty &&
          state.doc.textBetween(state.selection.from, state.selection.to).trim()
            .length > 0
        }
      >
        <div className="bubble-toolbar">
          <Tool
            label="Kalın"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </Tool>
          <Tool
            label="İtalik"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </Tool>
          <Tool
            label="Altı çizili"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={16} />
          </Tool>
          <Tool
            label="Üstü çizili"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={16} />
          </Tool>
          <button
            className="bubble-note"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openNote}
          >
            <MessageSquare size={14} /> Dipnot
          </button>
          <span className="toolbar-divider" />
          <Tool
            label="Sola hizala"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft size={17} />
          </Tool>
          <Tool
            label="Ortala"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter size={17} />
          </Tool>
        </div>
      </BubbleMenu>
      {note !== null && (
        <Modal title="DİPNOT" onClose={() => setNote(null)}>
          <div className="dialog-body">
            <Field label="Dipnot metni">
              <textarea
                autoFocus
                rows={5}
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bu metinle ilgili hatırlamak istediğiniz…"
              />
            </Field>
          </div>
          <footer className="modal-footer">
            <button className="button secondary" onClick={() => saveNote(true)}>
              Dipnotu kaldır
            </button>
            <button
              className="button primary"
              disabled={!note.trim()}
              onClick={() => saveNote()}
            >
              Dipnotu kaydet
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
