import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
} from "lucide-react";
export default function WikiRichText({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false })],
    content: value,
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  if (!editor) return null;
  return (
    <div className="wiki-richtext">
      <div
        className="wiki-formatting"
        role="toolbar"
        aria-label="Wiki metin biçimleri"
      >
        {[
          {
            name: "Kalın",
            icon: Bold,
            run: () => editor.chain().focus().toggleBold().run(),
          },
          {
            name: "İtalik",
            icon: Italic,
            run: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            name: "Başlık",
            icon: Heading2,
            run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          },
          {
            name: "Madde listesi",
            icon: List,
            run: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            name: "Numaralı liste",
            icon: ListOrdered,
            run: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            name: "Geri al",
            icon: Undo2,
            run: () => editor.chain().focus().undo().run(),
          },
          {
            name: "Yinele",
            icon: Redo2,
            run: () => editor.chain().focus().redo().run(),
          },
        ].map((b) => (
          <button type="button" key={b.name} title={b.name} onClick={b.run}>
            <b.icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
