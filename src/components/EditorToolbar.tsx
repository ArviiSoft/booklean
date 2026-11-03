import { useRef, useState, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  ImagePlus,
  MessageSquare,
  Highlighter,
  Search,
  HelpCircle,
  RemoveFormatting,
  ChevronDown,
  Type,
  Pilcrow,
  Plus,
  Link,
  Unlink,
  Code,
  Superscript,
  Subscript,
  IndentIncrease,
  IndentDecrease,
  Minus,
  WrapText,
  Check,
  Palette,
} from "lucide-react";
import Popover from "./Popover";
import { Field, Modal } from "./UI";
import fonts from "../../electron/fonts.json";
export function Tool({
  label,
  active,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? "active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
type Menu =
  "heading" | "text" | "color" | "paragraph" | "list" | "insert" | "font";
const colors = [
  ["Mürekkep", "#292a2c"],
  ["Beyaz", "#f4efe9"],
  ["Kırmızı", "#ce5b63"],
  ["Turuncu", "#c77c40"],
  ["Yeşil", "#42846d"],
  ["Mavi", "#537fc5"],
  ["Mor", "#a17bc6"],
  ["Pembe", "#bf6d98"],
];
const highlights = [
  ["Sarı", "#f4dc8f"],
  ["Yeşil", "#b5d5b1"],
  ["Mavi", "#b0d1ed"],
  ["Mor", "#d1b6e4"],
  ["Pembe", "#e9b9cc"],
  ["Şeftali", "#edc4a3"],
];
export default function EditorToolbar({
  editor,
  onNote,
  onSearch,
  onHelp,
  onImage,
}: {
  editor: Editor;
  onNote: () => void;
  onSearch: () => void;
  onHelp: () => void;
  onImage: () => void;
}) {
  useEditorState({
    editor,
    selector: ({ editor }) => ({
      selection: editor.state.selection,
      doc: editor.state.doc,
      marks: editor.state.storedMarks,
    }),
  });
  const [menu, setMenu] = useState<{ key: Menu; anchor: HTMLElement } | null>(
    null,
  );
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const linkSelection = useRef<{ from: number; to: number } | null>(null);
  const menuSelection = useRef<{ from: number; to: number } | null>(null);
  const labels: Record<Menu, string> = {
    heading: "Başlık türü",
    text: "Metin biçimleri",
    color: "Metin ve vurgu rengi",
    paragraph: "Paragraf düzeni",
    list: "Listeler",
    insert: "Ekle",
    font: "Seçili metnin yazı tipi ve boyutu",
  };
  const act = (action: () => unknown) => {
    if (menuSelection.current)
      editor.commands.setTextSelection(menuSelection.current);
    setMenu(null);
    action();
  };
  const item = (
    label: string,
    action: () => unknown,
    icon?: ReactNode,
    active = false,
    disabled = false,
  ) => (
    <button
      type="button"
      key={label}
      role="menuitem"
      aria-label={label}
      disabled={disabled}
      className={active ? "selected" : ""}
      onClick={() => act(action)}
    >
      {icon}
      <span>{label}</span>
      {active && <Check size={14} />}
    </button>
  );
  const trigger = (key: Menu, icon: ReactNode, text?: string) => (
    <button
      type="button"
      className={`tool-menu-trigger ${menu?.key === key ? "active" : ""}`}
      title={labels[key]}
      aria-label={labels[key]}
      aria-haspopup="menu"
      aria-expanded={menu?.key === key}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        menuSelection.current = {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        };
        setMenu(menu?.key === key ? null : { key, anchor: e.currentTarget });
      }}
    >
      {icon}
      {text && <span>{text}</span>}
      <ChevronDown size={12} />
    </button>
  );
  const blocks = (attrs: Record<string, unknown>, indentStep = 0) =>
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        state.doc.nodesBetween(
          state.selection.from,
          state.selection.to,
          (node, pos) => {
            if (["paragraph", "heading"].includes(node.type.name))
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...attrs,
                ...(indentStep
                  ? {
                      indent: Math.max(
                        0,
                        Math.min(5, (node.attrs.indent || 0) + indentStep),
                      ),
                    }
                  : {}),
              });
          },
        );
        return true;
      })
      .run();
  const changeCase = (kind: "upper" | "lower" | "title") =>
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { from, to } = state.selection;
        const replacements: {
          from: number;
          to: number;
          text: string;
          marks: typeof state.storedMarks;
        }[] = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!node.isText) return;
          const start = Math.max(pos, from),
            end = Math.min(pos + node.nodeSize, to);
          const value = node.text!.slice(start - pos, end - pos);
          const text =
            kind === "upper"
              ? value.toLocaleUpperCase("tr")
              : kind === "lower"
                ? value.toLocaleLowerCase("tr")
                : value
                    .toLocaleLowerCase("tr")
                    .replace(
                      /(^|\s)(\p{L})/gu,
                      (_, space, letter) =>
                        space + letter.toLocaleUpperCase("tr"),
                    );
          if (text)
            replacements.push({
              from: start,
              to: end,
              text,
              marks: node.marks,
            });
        });
        replacements
          .reverse()
          .forEach((r) =>
            tr.replaceWith(
              r.from,
              r.to,
              state.schema.text(r.text, r.marks || undefined),
            ),
          );
        return true;
      })
      .run();
  const openLink = () => {
    if (editor.isActive("link")) editor.commands.extendMarkRange("link");
    const { from, to } = editor.state.selection;
    linkSelection.current = { from, to };
    setLink(editor.getAttributes("link").href || "");
    setLinkError("");
  };
  const heading = editor.isActive("heading")
    ? `H${editor.getAttributes("heading").level}`
    : "Metin";
  return (
    <>
      <div
        className="editor-toolbar expanded-toolbar"
        role="toolbar"
        aria-label="Metin biçimlendirme"
      >
        <div className="toolbar-group">
          {trigger("heading", <Pilcrow size={17} />, heading)}
        </div>
        <div className="toolbar-group">
          <Tool
            label="Kalın (Ctrl+B)"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={17} />
          </Tool>
          <Tool
            label="İtalik (Ctrl+I)"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={17} />
          </Tool>
          <Tool
            label="Altı çizili (Ctrl+U)"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={17} />
          </Tool>
          {trigger("text", <Type size={17} />)}
          {trigger("font", <span className="font-tool-icon">Aa</span>)}
        </div>
        <div className="toolbar-group">
          {trigger("color", <Palette size={17} />)}
          {trigger("paragraph", <AlignLeft size={18} />)}
          {trigger("list", <List size={18} />)}
        </div>
        <div className="toolbar-group">
          {trigger("insert", <Plus size={18} />, "Ekle")}
        </div>
        <div className="toolbar-group">
          <Tool
            label="Geri al (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </Tool>
          <Tool
            label="Yinele (Ctrl+Shift+Z)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </Tool>
          <Tool
            label="Biçimlendirmeyi temizle"
            onClick={() =>
              editor
                .chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .resetAttributes("paragraph", [
                  "indent",
                  "blockLineHeight",
                  "textAlign",
                ])
                .run()
            }
          >
            <RemoveFormatting size={17} />
          </Tool>
        </div>
        <div className="toolbar-group last">
          <Tool label="Bul ve değiştir (Ctrl+F)" onClick={onSearch}>
            <Search size={18} />
          </Tool>
          <Tool label="Yazı odası rehberi" onClick={onHelp}>
            <HelpCircle size={17} />
          </Tool>
        </div>
      </div>
      {menu && (
        <Popover
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          label={labels[menu.key]}
          className="dropdown-menu editor-menu"
          width={menu.key === "font" ? 340 : 280}
        >
          <div className="menu-caption">{labels[menu.key]}</div>
          {menu.key === "heading" && (
            <>
              {item(
                "Normal metin",
                () => editor.chain().focus().setParagraph().run(),
                <Pilcrow size={17} />,
                !editor.isActive("heading"),
              )}
              {([1, 2, 3, 4, 5, 6] as const).map((level) =>
                item(
                  `Başlık ${level}`,
                  () => editor.chain().focus().toggleHeading({ level }).run(),
                  <b className="heading-level">H{level}</b>,
                  editor.isActive("heading", { level }),
                ),
              )}
            </>
          )}
          {menu.key === "text" && (
            <>
              {item(
                "Üstü çizili",
                () => editor.chain().focus().toggleStrike().run(),
                <Strikethrough size={17} />,
                editor.isActive("strike"),
              )}
              {item(
                "Üst simge",
                () => editor.chain().focus().toggleMark("superscript").run(),
                <Superscript size={17} />,
                editor.isActive("superscript"),
              )}
              {item(
                "Alt simge",
                () => editor.chain().focus().toggleMark("subscript").run(),
                <Subscript size={17} />,
                editor.isActive("subscript"),
              )}
              {item(
                "Satır içi kod",
                () => editor.chain().focus().toggleCode().run(),
                <Code size={17} />,
                editor.isActive("code"),
              )}
              <div className="menu-caption">Seçili metni dönüştür</div>
              {item(
                "BÜYÜK HARF",
                () => changeCase("upper"),
                <Type size={17} />,
                false,
                editor.state.selection.empty,
              )}
              {item(
                "küçük harf",
                () => changeCase("lower"),
                <Type size={17} />,
                false,
                editor.state.selection.empty,
              )}
              {item(
                "Baş Harfleri Büyüt",
                () => changeCase("title"),
                <Type size={17} />,
                false,
                editor.state.selection.empty,
              )}
            </>
          )}
          {menu.key === "font" && (
            <>
              <div className="menu-caption">Metin boyutu</div>
              <div className="size-options">
                {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={size}
                    aria-label={`${size} piksel`}
                    onClick={() =>
                      act(() =>
                        editor.chain().focus().setFontSize(`${size}px`).run(),
                      )
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
              {item("Varsayılan boyut", () =>
                editor.chain().focus().unsetFontSize().run(),
              )}
              <div className="menu-caption">Yazı tipi</div>
              {item("Varsayılan yazı tipi", () =>
                editor.chain().focus().unsetFontFamily().run(),
              )}
              {fonts.map((font) =>
                item(
                  font.name,
                  () => editor.chain().focus().setFontFamily(font.id).run(),
                  <span style={{ fontFamily: font.id }}>Aa</span>,
                  editor.isActive("textStyle", { fontFamily: font.id }),
                ),
              )}
            </>
          )}
          {menu.key === "color" && (
            <>
              <div className="menu-caption">Metin rengi</div>
              <div className="color-options">
                {colors.map(([name, color]) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={name}
                    title={name}
                    aria-label={`${name} metin`}
                    style={{ "--swatch": color } as React.CSSProperties}
                    onClick={() =>
                      act(() => editor.chain().focus().setColor(color).run())
                    }
                  >
                    {editor.isActive("textStyle", { color }) && (
                      <Check size={14} />
                    )}
                  </button>
                ))}
              </div>
              {item(
                "Metin rengini sıfırla",
                () => editor.chain().focus().unsetColor().run(),
                <RemoveFormatting size={16} />,
              )}
              <div className="menu-caption">Vurgu rengi</div>
              <div className="color-options">
                {highlights.map(([name, color]) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={name}
                    title={name}
                    aria-label={`${name} vurgu`}
                    style={{ "--swatch": color } as React.CSSProperties}
                    onClick={() =>
                      act(() =>
                        editor.chain().focus().toggleHighlight({ color }).run(),
                      )
                    }
                  >
                    {editor.isActive("highlight", { color }) && (
                      <Check size={14} />
                    )}
                  </button>
                ))}
              </div>
              {item(
                "Vurguyu kaldır",
                () => editor.chain().focus().unsetHighlight().run(),
                <Highlighter size={16} />,
              )}
            </>
          )}
          {menu.key === "paragraph" && (
            <>
              {(
                [
                  ["left", "Sola hizala", AlignLeft],
                  ["center", "Ortala", AlignCenter],
                  ["right", "Sağa hizala", AlignRight],
                  ["justify", "İki yana yasla", AlignJustify],
                ] as const
              ).map(([align, name, Icon]) =>
                item(
                  name,
                  () => editor.chain().focus().setTextAlign(align).run(),
                  <Icon size={17} />,
                  editor.isActive({ textAlign: align }),
                ),
              )}
              {item(
                "Girintiyi artır",
                () => blocks({}, 1),
                <IndentIncrease size={17} />,
              )}
              {item(
                "Girintiyi azalt",
                () => blocks({}, -1),
                <IndentDecrease size={17} />,
              )}
              <div className="menu-caption">Paragraf satır aralığı</div>
              {[1, 1.5, 1.8, 2, 2.5].map((height) =>
                item(
                  `${height} satır`,
                  () => blocks({ blockLineHeight: String(height) }),
                  <WrapText size={16} />,
                ),
              )}
              {item("Varsayılan satır aralığı", () =>
                blocks({ blockLineHeight: null }),
              )}
            </>
          )}
          {menu.key === "list" && (
            <>
              {item(
                "Madde işaretli liste",
                () => editor.chain().focus().toggleBulletList().run(),
                <List size={17} />,
                editor.isActive("bulletList"),
              )}
              {item(
                "Numaralı liste",
                () => editor.chain().focus().toggleOrderedList().run(),
                <ListOrdered size={17} />,
                editor.isActive("orderedList"),
              )}
              {item(
                "Alt listeye taşı",
                () => editor.chain().focus().sinkListItem("listItem").run(),
                <IndentIncrease size={17} />,
                false,
                !editor.can().sinkListItem("listItem"),
              )}
              {item(
                "Üst listeye taşı",
                () => editor.chain().focus().liftListItem("listItem").run(),
                <IndentDecrease size={17} />,
                false,
                !editor.can().liftListItem("listItem"),
              )}
            </>
          )}
          {menu.key === "insert" && (
            <>
              {item(
                "Alıntı",
                () => editor.chain().focus().toggleBlockquote().run(),
                <Quote size={17} />,
                editor.isActive("blockquote"),
              )}
              {item(
                "Kod bloğu",
                () => editor.chain().focus().toggleCodeBlock().run(),
                <Code size={17} />,
                editor.isActive("codeBlock"),
              )}
              {item(
                "Dipnot ekle / düzenle",
                onNote,
                <MessageSquare size={17} />,
                editor.isActive("footnote"),
              )}
              {item("Görsel ekle", onImage, <ImagePlus size={17} />)}
              {item(
                "Bağlantı ekle / düzenle",
                openLink,
                <Link size={17} />,
                editor.isActive("link"),
              )}
              {item(
                "Bağlantıyı kaldır",
                () =>
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run(),
                <Unlink size={17} />,
                false,
                !editor.isActive("link"),
              )}
              {item(
                "Sahne ayırıcı ekle",
                () => editor.chain().focus().setHorizontalRule().run(),
                <Minus size={17} />,
              )}
              {item(
                "Satır sonu ekle",
                () => editor.chain().focus().setHardBreak().run(),
                <WrapText size={17} />,
              )}
              <div className="menu-caption">Özel karakterler</div>
              <div className="symbol-options">
                {[
                  "—",
                  "–",
                  "…",
                  "“",
                  "”",
                  "‘",
                  "’",
                  "«",
                  "»",
                  "©",
                  "®",
                  "°",
                  "✦",
                  "•",
                ].map((symbol) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={symbol}
                    aria-label={`${symbol} ekle`}
                    onClick={() =>
                      act(() =>
                        editor.chain().focus().insertContent(symbol).run(),
                      )
                    }
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </>
          )}
        </Popover>
      )}
      {link !== null && (
        <Modal title="Bağlantı ekle / düzenle" onClose={() => setLink(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const href = link.trim();
              try {
                const url = new URL(href);
                if (!["http:", "https:", "mailto:"].includes(url.protocol))
                  throw new Error();
              } catch {
                setLinkError(
                  "Geçerli bir https://, http:// veya mailto: adresi girin.",
                );
                return;
              }
              const range = linkSelection.current;
              if (range) {
                const chain = editor.chain().focus().setTextSelection(range);
                if (range.from === range.to)
                  chain
                    .insertContent({
                      type: "text",
                      text: href,
                      marks: [{ type: "link", attrs: { href } }],
                    })
                    .run();
                else chain.setLink({ href }).run();
              }
              setLink(null);
            }}
          >
            <div className="dialog-body">
              <Field label="Bağlantı adresi">
                <input
                  autoFocus
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              {linkError && <p role="alert">{linkError}</p>}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setLink(null)}
              >
                Vazgeç
              </button>
              <button className="button primary" disabled={!link.trim()}>
                Bağlantıyı kaydet
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
