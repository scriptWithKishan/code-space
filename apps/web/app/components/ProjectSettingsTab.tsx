'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '../context/ProjectContext';
import { useProject } from '../context/ProjectContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useRouter } from 'next/navigation';
import {
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ListCheck,
  Edit,
  Search,
  Settings,
  Sliders,
} from 'lucide-react';
import { api } from '../lib/api';
import EditTaskModal from './EditTaskModal';
import DeleteTaskConfirmationModal from './DeleteTaskConfirmationModal';
import { TaskItem } from './TaskDetailModal';
import { ProjectMemberItem } from './AddTaskModal';

export default function ProjectSettingsTab({ project }: { project: Project }) {
  const { updateProject, deleteProject, refreshProjects } = useProject();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  // Internal Sub-tab state
  const [subTab, setSubTab] = useState<'general' | 'tasks'>('general');

  // General Settings state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'COMPLETED'>(project.status);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Task Administration state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskSearch, setTaskSearch] = useState('');

  // Modals state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingTaskTitle, setDeletingTaskTitle] = useState('');
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);

  const fetchProjectTasks = useCallback(async () => {
    if (!project._id) return;
    try {
      setLoadingTasks(true);
      const res = await api.get(`/projects/${project._id}/tasks?limit=100`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch project tasks for settings', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [project._id]);

  useEffect(() => {
    fetchProjectTasks();
  }, [fetchProjectTasks]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await updateProject(project._id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update project settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (confirmName.trim() !== project.name) return;

    try {
      setDeleting(true);
      await deleteProject(project._id);
      setIsDeleteModalOpen(false);
      if (activeWorkspace) {
        router.push(`/w/${activeWorkspace.slug}`);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to delete project.');
      setDeleting(false);
    }
  };

  const projectMembersList: ProjectMemberItem[] = (project.members || []).map((m: any) => {
    if (typeof m === 'object' && m !== null) {
      return {
        id: m._id || m.id,
        name: m.name || 'Member',
        email: m.email || '',
        avatarUrl: m.avatarUrl,
      };
    }
    return { id: String(m), name: 'Member', email: '' };
  });

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase())
  );

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
    <div className="space-y-6 max-w-4xl py-2">
      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              subTab === 'general'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>General Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              subTab === 'tasks'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ListCheck className="h-4 w-4" />
            <span>Task Administration</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              subTab === 'tasks' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {tasks.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: General Settings */}
      {subTab === 'general' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <form onSubmit={handleSaveGeneral} className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">General Metadata & Status</h3>
              <p className="text-xs text-muted-foreground">Update project title, description, and status</p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>Project settings updated successfully!</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Project Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  required
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
                  maxLength={300}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Project Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'ACTIVE', label: 'Active (Ongoing)', color: 'text-emerald-500 border-emerald-500/30' },
                    { key: 'COMPLETED', label: 'Completed', color: 'text-blue-500 border-blue-500/30' },
                    { key: 'ARCHIVED', label: 'Archived', color: 'text-slate-400 border-slate-500/30' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatus(item.key as any)}
                      className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                        status === item.key
                          ? `bg-primary/15 border-primary text-primary shadow-2xs`
                          : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/20 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-destructive">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove this project and all associated task references.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-destructive/20">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90 transition shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Task Administration (Table View) */}
      {subTab === 'tasks' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Task Administration</h3>
              <p className="text-xs text-muted-foreground">Admin management view to edit or delete any task in this project</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
              />
            </div>
          </div>

          {/* Borderless Modern Administration Table */}
          <div className="w-full overflow-x-auto rounded-2xl bg-card/60 border border-border/60 transition">
            {loadingTasks ? (
              <div className="flex h-44 w-full items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                Loading tasks table...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 space-y-2">
                <ListCheck className="h-8 w-8 text-muted-foreground/50" />
                <h4 className="text-xs font-semibold text-foreground">No Tasks Found</h4>
                <p className="text-[11px] text-muted-foreground">No tasks match your search filter in this project.</p>
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
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredTasks.map((t) => (
                    <tr key={t._id} className="group hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 max-w-xs font-semibold text-foreground">
                        <span className="line-clamp-1">{t.title}</span>
                        {t.description && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 font-normal">
                            {t.description}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {t.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] border border-primary/20 shrink-0">
                              {t.assigneeId.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground text-xs">{t.assigneeId.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityBadges[t.priority] || priorityBadges.MEDIUM}`}>
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadges[t.status] || statusBadges.TODO}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(t);
                              setIsEditModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition"
                            title="Edit task details"
                          >
                            <Edit className="h-3.5 w-3.5 text-primary" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingTaskId(t._id);
                              setDeletingTaskTitle(t.title);
                              setIsDeleteTaskModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive hover:text-white transition"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 text-destructive shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Delete Project</h3>
                <p className="text-xs text-muted-foreground">Type project name to confirm deletion</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please type <span className="font-bold text-foreground">"{project.name}"</span> below to proceed with deletion:
            </p>

            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmName('');
                }}
                disabled={deleting}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleting || confirmName.trim() !== project.name}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90 transition shadow-xs disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        projectMembers={projectMembersList}
        onTaskUpdated={() => {
          fetchProjectTasks();
          refreshProjects();
        }}
      />

      {/* Delete Task Confirmation Modal */}
      <DeleteTaskConfirmationModal
        isOpen={isDeleteTaskModalOpen}
        onClose={() => {
          setIsDeleteTaskModalOpen(false);
          setDeletingTaskId(null);
        }}
        taskId={deletingTaskId}
        taskTitle={deletingTaskTitle}
        onDeleted={() => {
          fetchProjectTasks();
          refreshProjects();
        }}
      />
    </div>
  );
}
