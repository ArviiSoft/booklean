import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
export const Superscript = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML() {
    return [{ tag: "sup" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", HTMLAttributes, 0];
  },
});
export const Subscript = Mark.create({
  name: "subscript",
  excludes: "superscript",
  parseHTML() {
    return [{ tag: "sub" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", HTMLAttributes, 0];
  },
});
export const ParagraphLayout = Extension.create({
  name: "paragraphLayout",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) =>
              Math.max(
                0,
                Math.min(
                  5,
                  Math.round(parseFloat(el.style.marginLeft || "0") / 24),
                ),
              ),
            renderHTML: (attrs) =>
              attrs.indent
                ? { style: `margin-left: ${attrs.indent * 24}px` }
                : {},
          },
          blockLineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.blockLineHeight
                ? { style: `line-height: ${attrs.blockLineHeight}` }
                : {},
          },
        },
      },
    ];
  },
});
export const Footnote = Mark.create({
  name: "footnote",
  addAttributes() {
    return {
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note"),
        renderHTML: (attrs) => ({ "data-note": attrs.note, title: attrs.note }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-note]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "footnote-mark" }),
      0,
    ];
  },
});
export const searchKey = new PluginKey("booklean-search");
export function findMatches(
  doc: Node,
  query: string,
): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = [];
  if (!query) return matches;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let content = "";
    const positions: number[] = [];
    node.descendants((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text!.length; i++) {
          positions.push(pos + 1 + offset + i);
          content += child.text![i];
        }
      } else if (child.isLeaf) {
        positions.push(pos + 1 + offset);
        content += " ";
      }
    });
    const haystack = content.toLocaleLowerCase("tr"),
      needle = query.toLocaleLowerCase("tr");
    let at = 0;
    while ((at = haystack.indexOf(needle, at)) !== -1) {
      matches.push({
        from: positions[at],
        to: positions[at + needle.length - 1] + 1,
      });
      at += needle.length;
    }
    return false;
  });
  return matches;
}
export const SearchHighlight = Extension.create({
  name: "searchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => ({ query: "", index: 0 }),
          apply(tr, prev) {
            return tr.getMeta(searchKey) || prev;
          },
        },
        props: {
          decorations(state) {
            const current = searchKey.getState(state);
            return DecorationSet.create(
              state.doc,
              findMatches(state.doc, current.query).map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class:
                    i === current.index
                      ? "search-match current"
                      : "search-match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
