import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, User, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import KanbanColumn from './KanbanColumn';
import KanbanTask from './KanbanTask';

const KanbanBoard = ({ tasks, onTaskUpdate, onTaskDelete, users }) => {
  const [activeId, setActiveId] = useState(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = [
    { id: 'todo', title: 'Por Hacer', status: 'todo' },
    { id: 'in_progress', title: 'En Progreso', status: 'in_progress' },
    { id: 'review', title: 'En Revisión', status: 'review' },
    { id: 'done', title: 'Completado', status: 'done' },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTask = tasks.find(t => t.task_id === active.id);
    if (!activeTask) return;

    // Verificar si se suelta sobre una columna
    const column = columns.find(c => c.id === over.id);
    if (column && activeTask.status !== column.status) {
      return;
    }

    // Verificar si se suelta sobre otra tarea
    const overTask = tasks.find(t => t.task_id === over.id);
    if (overTask && activeTask.status !== overTask.status) {
      return;
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;

    const activeTask = tasks.find(t => t.task_id === active.id);
    if (!activeTask) return;

    // Verificar si se suelta sobre una columna
    const column = columns.find(c => c.id === over.id);
    if (column && activeTask.status !== column.status) {
      onTaskUpdate(activeTask.task_id, { ...activeTask, status: column.status });
      return;
    }

    // Verificar si se suelta sobre otra tarea
    const overTask = tasks.find(t => t.task_id === over.id);
    if (overTask && activeTask.status !== overTask.status) {
      onTaskUpdate(activeTask.task_id, { ...activeTask, status: overTask.status });
    }
  };

  const activeTask = activeId ? tasks.find(t => t.task_id === activeId) : null;

  const getUserName = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user ? user.name : 'No asignado';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.status);
          
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={columnTasks.length}
            >
              <SortableContext items={columnTasks.map(t => t.task_id)}>
                <div className="space-y-3">
                  {columnTasks.map(task => (
                    <KanbanTask
                      key={task.task_id}
                      task={task}
                      getUserName={getUserName}
                      getPriorityColor={getPriorityColor}
                      onDelete={onTaskDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="border-slate-200 shadow-lg opacity-90 cursor-grabbing">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[#0F172A] text-sm">{activeTask.title}</h3>
                <Badge className={`${getPriorityColor(activeTask.priority)} border text-xs`}>
                  {activeTask.priority}
                </Badge>
              </div>
              {activeTask.description && (
                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{activeTask.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                {activeTask.assigned_to && (
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    <span>{getUserName(activeTask.assigned_to)}</span>
                  </div>
                )}
                {activeTask.due_date && (
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{activeTask.due_date}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
