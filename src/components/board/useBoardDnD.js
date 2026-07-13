// src/components/board/useBoardDnD.js
// Native HTML5 drag-and-drop state machine for the board, extracted from the
// old admin Kanban's proven handler shape, plus rAF edge auto-scroll — native
// DnD never scrolls a horizontally overflowing container on its own.

import { useEffect, useRef, useState } from 'react';

const EDGE_PX = 90;
const SCROLL_SPEED = 16;

export function useBoardDnD(onDropCard) {
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const scrollRef = useRef(null);
  const rafRef = useRef(0);

  const stopAutoScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  // Nudge scrollLeft while the pointer hovers near either edge of the board.
  const autoScroll = clientX => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = 0;
    if (clientX < rect.left + EDGE_PX) dx = -SCROLL_SPEED;
    else if (clientX > rect.right - EDGE_PX) dx = SCROLL_SPEED;
    stopAutoScroll();
    if (!dx) return;
    const step = () => {
      el.scrollLeft += dx;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => stopAutoScroll, []);

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onColumnDragOver = (e, colName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colName);
    autoScroll(e.clientX);
  };

  const onDrop = (e, colName) => {
    e.preventDefault();
    stopAutoScroll();
    if (dragId) onDropCard(dragId, colName);
    setDragId(null);
    setDragOver(null);
  };

  const onDragEnd = () => {
    stopAutoScroll();
    setDragId(null);
    setDragOver(null);
  };

  return { dragId, dragOver, scrollRef, onDragStart, onColumnDragOver, onDrop, onDragEnd };
}
