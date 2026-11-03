import { useRef, useState, type DragEvent } from "react";

type Placement = "before" | "after";

export function reorderItems<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
  placement: Placement,
): T[] {
  const source = items.find((item) => item.id === sourceId);
  if (
    !source ||
    sourceId === targetId ||
    !items.some((item) => item.id === targetId)
  )
    return items;
  const next = items.filter((item) => item.id !== sourceId);
  const index = next.findIndex((item) => item.id === targetId);
  next.splice(index + (placement === "after" ? 1 : 0), 0, source);
  return next;
}

export default function useSortableList(
  kind: string,
  onMove: (sourceId: string, targetId: string, placement: Placement) => void,
  onStart: () => void,
  axis: "vertical" | "horizontal" = "vertical",
) {
  const source = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<{
    id: string;
    placement: Placement;
  } | null>(null);
  const reset = () => {
    source.current = null;
    setDragging(null);
    setTarget(null);
  };
  const placementAt = (event: DragEvent<HTMLElement>): Placement => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      axis === "horizontal"
        ? event.clientX < bounds.left + bounds.width / 2
        : event.clientY < bounds.top + bounds.height / 2
    )
      ? "before"
      : "after";
  };
  return (id: string) => ({
    draggable: true,
    "data-sort-id": id,
    "data-dragging": dragging === id || undefined,
    "data-drop-position": target?.id === id ? target.placement : undefined,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("[data-no-drag]")) {
        event.preventDefault();
        return;
      }
      source.current = id;
      setDragging(id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(`application/x-booklean-${kind}`, id);
      onStart();
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!source.current) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setTarget(
        source.current === id ? null : { id, placement: placementAt(event) },
      );
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!source.current) return;
      event.preventDefault();
      onMove(source.current, id, placementAt(event));
      reset();
    },
    onDragEnd: reset,
  });
}
