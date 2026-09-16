'use client';

import React, { useState } from 'react';
import { Project } from '../context/ProjectContext';
import { useProject } from '../context/ProjectContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { Save, Trash2, AlertTriangle, Loader2, CheckCircle2, UserX } from 'lucide-react';

export default function ProjectSettingsTab({ project }: { project: Project }) {
  const { updateProject, deleteProject } = useProject();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'COMPLETED'>(project.status);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
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

  const handleDelete = async () => {
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

  return (
    <div className="space-y-8 max-w-3xl py-2">
      {/* General Settings Card */}
      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">General Project Settings</h3>
          <p className="text-xs text-muted-foreground">Update project title, scope, and lifecycle status</p>
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
                { key: 'ACTIVE', label: 'Active', color: 'text-emerald-500 border-emerald-500/30' },
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
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
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

      {/* Danger Zone Card */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/20 text-destructive shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-destructive">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently remove this project and all associated task references. This action cannot be undone.
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

      {/* Delete Confirmation Modal */}
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
                onClick={handleDelete}
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
    </div>
  );
}
