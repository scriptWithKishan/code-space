'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  ListTodo,
} from 'lucide-react';
import { api } from '../lib/api';
import TaskDetailModal, { TaskItem } from './TaskDetailModal';

interface BorderlessTaskTableProps {
  projectId: string;
  isAdmin: boolean;
  currentUserId: string;
  onStatsRefresh: () => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function BorderlessTaskTable({
  projectId,
  isAdmin,
  currentUserId,
  onStatsRefresh,
  onEditTask,
  onDeleteTask,
}: BorderlessTaskTableProps) {
  const [viewMode, setViewMode] = useState<'all' | 'myTasks'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const limit = 10;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));

      if (viewMode === 'myTasks') {
        params.append('myTasks', 'true');
      }
      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter);
      }
      if (searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }

      const res = await api.get(`/projects/${projectId}/tasks?${params.toString()}`);
      setTasks(res.data.tasks || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch project tasks', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, limit, viewMode, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Reset to page 1 on filter/search change
  const handleViewModeChange = (mode: 'all' | 'myTasks') => {
    setViewMode(mode);
    setPage(1);
  };

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilter(priority);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskId(taskId);
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      await fetchTasks();
      onStatsRefresh();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleOpenDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  const priorityBadges: Record<string, string> = {
    LOW: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    MEDIUM: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    HIGH: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    URGENT: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const statusBadges: Record<string, string> = {
    TODO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    IN_REVIEW: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    DONE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/60 shadow-xs">
        {/* Toggle Switch: [ All Tasks | Your Tasks ] */}
        <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/40 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleViewModeChange('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Tasks
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('myTasks')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              viewMode === 'myTasks'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Your Tasks
          </button>
        </div>

        {/* Priority Filter & Search Bar */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Priority Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={priorityFilter}
              onChange={(e) => handlePriorityFilterChange(e.target.value)}
              className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Filter tasks by title..."
              className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
            />
          </div>
        </div>
      </div>

      {/* Borderless Modern Table */}
      <div className="w-full overflow-x-auto rounded-2xl bg-card/40 transition">
        {loading ? (
          <div className="flex h-44 w-full items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            Loading task table...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 space-y-2">
            <ListTodo className="h-8 w-8 text-muted-foreground/50" />
            <h4 className="text-xs font-semibold text-foreground">No Tasks Found</h4>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              {viewMode === 'myTasks'
                ? 'No tasks are currently assigned to you matching your filter.'
                : 'No tasks have been created in this project yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground text-[11px] font-semibold">
                <th className="py-3 px-4">Task Topic</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {tasks.map((task) => {
                const assigneeIdStr = task.assigneeId
                  ? typeof task.assigneeId === 'object'
                    ? (task.assigneeId._id || (task.assigneeId as any).id || '').toString()
                    : String(task.assigneeId)
                  : '';
                const isAssignee = Boolean(assigneeIdStr && assigneeIdStr === currentUserId);
                const canChangeStatus = isAssignee;

                return (
                  <tr
                    key={task._id}
                    className="group hover:bg-muted/40 transition-colors"
                  >
                    {/* Task Topic Title Link */}
                    <td className="py-3 px-4 max-w-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(task._id)}
                        className="text-left font-semibold text-foreground hover:text-primary transition line-clamp-1 cursor-pointer"
                        title="Click to view task details"
                      >
                        {task.title}
                      </button>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {task.assigneeId ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] border border-primary/20 shrink-0">
                            {task.assigneeId.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground text-xs">{task.assigneeId.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityBadges[task.priority] || priorityBadges.MEDIUM}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Inline Status Dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          disabled={!canChangeStatus || updatingTaskId === task._id}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-ring transition cursor-pointer disabled:opacity-50 ${statusBadges[task.status]}`}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="DONE">Completed</option>
                        </select>
                        {updatingTaskId === task._id && (
                          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Backend Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
          <p className="text-[11px]">
            Showing <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-foreground">{total}</span> tasks
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 font-semibold text-foreground hover:bg-muted transition disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="text-[11px] font-semibold px-2">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 font-semibold text-foreground hover:bg-muted transition disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        taskId={selectedTaskId}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onTaskUpdated={() => {
          fetchTasks();
          onStatsRefresh();
        }}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
}
