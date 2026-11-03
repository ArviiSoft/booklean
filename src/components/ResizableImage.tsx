import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { LockKeyhole, LockKeyholeOpen, RotateCcw, Trash2 } from "lucide-react";

const clamp = (value: number, max: number) =>
  Math.round(Math.min(max, Math.max(40, value)));
export const DEFAULT_IMAGE_WIDTH = 400;

function ImageView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) {
  const width = Number(node.attrs.width) || DEFAULT_IMAGE_WIDTH;
  const height = Number(node.attrs.height) || 0;
  const ratio = height > 0 ? width / height : 1;
  const [draft, setDraft] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [widthInput, setWidthInput] = useState(String(width));
  const [heightInput, setHeightInput] = useState(String(height));
  const [locked, setLocked] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    setWidthInput(String(width));
    setHeightInput(String(height));
  }, [width, height]);
  useEffect(() => () => cleanup.current?.(), []);
  function commitSize(axis: "width" | "height", raw: string) {
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n)) {
      setWidthInput(String(width));
      setHeightInput(String(height));
      return;
    }
    let w = axis === "width" ? clamp(n, 1600) : width;
    let h = axis === "height" ? clamp(n, 2400) : height;
    if (locked) {
      if (axis === "width") h = clamp(w / ratio, 2400);
      else w = clamp(h * ratio, 1600);
    }
    updateAttributes({ width: w, height: h });
  }
  function startResize(event: PointerEvent, corner: string) {
    if (event.button !== 0 || !box.current) return;
    event.preventDefault();
    event.stopPropagation();
    cleanup.current?.();
    const pos = getPos();
    if (typeof pos === "number") editor.commands.setNodeSelection(pos);
    const bounds = box.current.getBoundingClientRect();
    const maxWidth = editor.view.dom.clientWidth;
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: bounds.width,
      height: bounds.height,
    };
    let next = { width: start.width, height: start.height };
    const move = (e: globalThis.PointerEvent) => {
      let w =
        start.width +
        (e.clientX - start.x) * (corner.includes("left") ? -1 : 1);
      let h =
        start.height +
        (e.clientY - start.y) * (corner.includes("top") ? -1 : 1);
      if (locked && !e.shiftKey) {
        const aspect = start.width / start.height;
        const scale =
          Math.abs(w / start.width - 1) >= Math.abs(h / start.height - 1)
            ? w / start.width
            : h / start.height;
        w = clamp(start.width * scale, Math.min(1600, maxWidth));
        h = Math.round(w / aspect);
      }
      next = {
        width: clamp(w, Math.min(1600, maxWidth)),
        height: clamp(h, 2400),
      };
      setDraft(next);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      cleanup.current = null;
    };
    const finish = () => {
      stop();
      setDraft(null);
      updateAttributes(next);
    };
    const cancel = () => {
      stop();
      setDraft(null);
    };
    cleanup.current = stop;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  }
  function reset() {
    const img = image.current;
    if (!img?.naturalWidth) return;
    const w = Math.min(DEFAULT_IMAGE_WIDTH, img.naturalWidth);
    updateAttributes({
      width: w,
      height: Math.round((w * img.naturalHeight) / img.naturalWidth),
    });
  }
  const size = draft || { width, height };
  return (
    <NodeViewWrapper
      className={`resizable-image-node ${selected ? "is-selected" : ""}`}
      contentEditable={false}
      data-booklean-image="true"
    >
      <div
        ref={box}
        className="resizable-image-box"
        style={{
          width: `${size.width}px`,
          aspectRatio: size.height
            ? `${size.width} / ${size.height}`
            : undefined,
        }}
      >
        <img
          ref={image}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          draggable={false}
          onLoad={() => {
            if (!height && image.current?.naturalWidth) {
              const w = Math.min(width, image.current.naturalWidth);
              updateAttributes({
                width: w,
                height: Math.round(
                  (w * image.current.naturalHeight) /
                    image.current.naturalWidth,
                ),
              });
            }
          }}
        />
        {selected && (
          <>
            {["top-left", "top-right", "bottom-left", "bottom-right"].map(
              (corner) => (
                <button
                  key={corner}
                  className={`image-resize-handle ${corner}`}
                  aria-label={`Görseli boyutlandır ${corner}`}
                  onPointerDown={(e) => startResize(e, corner)}
                />
              ),
            )}
            <div
              className="image-size-controls"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <label>
                G
                <input
                  aria-label="Görsel genişliği"
                  type="number"
                  min={40}
                  max={1600}
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  onBlur={() => commitSize("width", widthInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitSize("width", widthInput);
                    }
                  }}
                />
              </label>
              <button
                title={locked ? "Oran kilidini aç" : "En boy oranını koru"}
                aria-pressed={locked}
                onClick={() => setLocked(!locked)}
              >
                {locked ? (
                  <LockKeyhole size={13} />
                ) : (
                  <LockKeyholeOpen size={13} />
                )}
              </button>
              <label>
                Y
                <input
                  aria-label="Görsel yüksekliği"
                  type="number"
                  min={40}
                  max={2400}
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  onBlur={() => commitSize("height", heightInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitSize("height", heightInput);
                    }
                  }}
                />
              </label>
              <span>px</span>
              <button title="Varsayılan görsel boyutuna dön" onClick={reset}>
                <RotateCcw size={13} />
              </button>
              <button
                title="Görseli sil"
                aria-label="Görseli sil"
                onClick={() => {
                  deleteNode();
                  editor.commands.focus();
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: DEFAULT_IMAGE_WIDTH,
        parseHTML: (el) =>
          Number(el.getAttribute("width")) || DEFAULT_IMAGE_WIDTH,
      },
      height: {
        default: null,
        parseHTML: (el) => Number(el.getAttribute("height")) || null,
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
  renderHTML({ HTMLAttributes }) {
    const w = Number(HTMLAttributes.width),
      h = Number(HTMLAttributes.height);
    return [
      "img",
      mergeAttributes(
        HTMLAttributes,
        w > 0 && h > 0 ? { style: `aspect-ratio: ${w} / ${h}` } : {},
      ),
    ];
  },
}).configure({ allowBase64: true });
