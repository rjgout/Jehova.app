"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface DragHandleProps {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
}

/**
 * Herbruikbare sleep-en-herordenen-lijst (courses/games-pagina's) — de tegel
 * komt pas los als je specifiek het greep-icoontje (zie DragHandle
 * hieronder) vasthoudt, niet de hele kaart, zodat een gewone tik op de kaart
 * gewoon blijft navigeren. `items` moet een stabiele `id` per rij hebben.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
  dndId,
}: {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, handle: DragHandleProps) => ReactNode;
  className?: string;
  /**
   * Vaste, unieke id voor deze DndContext (bv. "courses-list") — dnd-kit
   * genereert anders zelf een intern teller-ID voor aria-describedby, dat
   * op de server (verse tellerstand) en de client (kan al opgehoogd zijn
   * door StrictMode-dubbelrendering) uiteen kan lopen en een hydration-
   * mismatchwaarschuwing geeft. Zie https://github.com/clauderic/dnd-kit/issues/900.
   */
  dndId: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Kleine vertraging op touch: voorkomt dat een gewone tik/scroll op het
    // icoontje meteen als sleepbeweging wordt opgevat.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: (handle: DragHandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-shadow ${isDragging ? "shadow-xl scale-[1.02] opacity-95" : ""}`}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

/** Het greep-icoontje zelf — spreidt de sleep-luisteraars alleen hierop uit. */
export function DragHandle({ attributes, listeners }: DragHandleProps) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-400 px-1 -ml-1 select-none"
      aria-label="Verslepen om te herordenen"
      onClick={(e) => e.preventDefault()}
    >
      ⠿
    </button>
  );
}
