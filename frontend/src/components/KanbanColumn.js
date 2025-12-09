import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from './ui/card';

const KanbanColumn = ({ id, title, count, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col ${isOver ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-semibold text-[#0F172A] tracking-tight">{title}</h3>
        <span className="text-sm text-slate-500 font-medium">{count}</span>
      </div>
      <div
        className={`flex-1 rounded-lg p-3 min-h-[200px] transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-slate-50 border-2 border-transparent'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default KanbanColumn;
