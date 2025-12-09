import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, User, Trash2, GripVertical } from 'lucide-react';

const KanbanTask = ({ task, getUserName, getPriorityColor, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.task_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        data-testid={`kanban-task-${task.task_id}`}
        className="border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow"
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[#0F172A] text-sm line-clamp-2 flex-1">
                  {task.title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.task_id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              
              <Badge className={`${getPriorityColor(task.priority)} border text-xs mb-2`}>
                {task.priority}
              </Badge>

              {task.description && (
                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{task.description}</p>
              )}

              <div className="space-y-1">
                {task.assigned_to && (
                  <div className="flex items-center text-xs text-slate-500">
                    <User className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{getUserName(task.assigned_to)}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center text-xs text-slate-500">
                    <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>{task.due_date}</span>
                  </div>
                )}
              </div>

              {task.progress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Progreso</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanTask;
