'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Clock, User, Calendar, AlertCircle, Edit, Trash2, CheckCircle2, Search } from 'lucide-react';
import { api } from '../lib/api';

export interface TaskItem {
  _id: string;
  projectId: any;
  workspaceId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  creatorId: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  isAdmin: boolean;
  currentUserId: string;
  onTaskUpdated: () => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  taskId,
  isAdmin,
  currentUserId,
  onTaskUpdated,
  onEditTask,
  onDeleteTask,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      setError(null);
      api
        .get<TaskItem>(`/tasks/${taskId}`)
        .then((res) => {
          setTask(res.data);
        })
        .catch((err) => {
          console.error('Failed to load task details', err);
          setError('Failed to load task details. It may have been deleted.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setTask(null);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStatusChange = async (newStatus: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') => {
    if (!task) return;
    try {
      setUpdatingStatus(true);
      const res = await api.patch<TaskItem>(`/tasks/${task._id}/status`, { status: newStatus });
      setTask(res.data);
      onTaskUpdated();
    } catch (err: any) {
      console.error('Failed to update task status', err);
      setError(err?.response?.data?.message || 'Failed to update task status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const assigneeIdStr = task?.assigneeId
    ? typeof task.assigneeId === 'object'
      ? (task.assigneeId._id || (task.assigneeId as any).id || '').toString()
      : String(task.assigneeId)
    : '';
  const isAssignee = Boolean(assigneeIdStr && assigneeIdStr === currentUserId);
  const canUpdateStatus = isAssignee;

  const priorityStyles = {
    LOW: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    MEDIUM: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    HIGH: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    URGENT: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const statusStyles = {
    TODO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    IN_REVIEW: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DONE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-hidden">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl transition-all overflow-x-hidden space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold font-mono text-muted-foreground uppercase">Task Detail</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 w-full items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            Loading task details...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <p>{error}</p>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-background text-foreground border border-border font-medium hover:bg-muted"
            >
              Close
            </button>
          </div>
        ) : task ? (
          <div className="space-y-4">
            {/* Task Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${priorityStyles[task.priority]}`}>
                  {task.priority} PRIORITY
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyles[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground leading-snug">{task.title}</h2>
            </div>

            {/* Task Message / Description */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Task Message / Description</h4>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {task.description || <span className="italic text-muted-foreground">No description provided for this task.</span>}
              </p>
            </div>

            {/* Meta Grid (Assignee, Creator, Dates) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Assignee */}
              <div className="rounded-xl border border-border/60 p-3 bg-card space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Assigned User</span>
                {task.assigneeId ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 border border-primary/20">
                      {task.assigneeId.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{task.assigneeId.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{task.assigneeId.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-[11px]">Unassigned</p>
                )}
              </div>

              {/* Creator */}
              <div className="rounded-xl border border-border/60 p-3 bg-card space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Created By</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-xs shrink-0">
                    {task.creatorId?.name ? task.creatorId.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{task.creatorId?.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Change Control */}
            <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Task Status:</span>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  disabled={!canUpdateStatus || updatingStatus}
                  className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition cursor-pointer disabled:opacity-50"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Completed</option>
                </select>
                {updatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  {onEditTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditTask(task);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
                      title="Edit task details"
                    >
                      <Edit className="h-3.5 w-3.5 text-primary" />
                      <span>Edit</span>
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteTask(task._id);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
