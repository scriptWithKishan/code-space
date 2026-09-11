'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Trash2, Save, Loader2, ShieldCheck, User } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useConversation } from '../context/ConversationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function WorkspaceSettingsModal() {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { isSettingsModalOpen, closeSettingsModal } = useConversation();
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || '');
    }
  }, [activeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsModalOpen) {
        closeSettingsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsModalOpen, closeSettingsModal]);

  if (!isSettingsModalOpen || !activeWorkspace) return null;

  const isOwner = user && activeWorkspace.ownerId === user.id;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.patch(`/workspaces/${activeWorkspace._id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      await refreshWorkspaces();
      setSuccess('Workspace settings saved successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update workspace.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setDeleting(true);
      setError(null);

      await api.delete(`/workspaces/${activeWorkspace._id}`);
      await refreshWorkspaces();
      closeSettingsModal();
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to delete workspace.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Workspace Settings</h2>
              <p className="text-xs text-muted-foreground truncate">{activeWorkspace.name}</p>
            </div>
          </div>
          <button
            onClick={closeSettingsModal}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mt-4 space-x-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'members'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Members ({activeWorkspace.members.length})
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab('danger')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
                activeTab === 'danger'
                  ? 'border-destructive text-destructive font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-destructive'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Danger Zone
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 min-h-[220px]">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {success}
            </div>
          )}

          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Workspace Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeWorkspace.members.map((member, idx) => {
                const isMemberUserObj = typeof member.userId === 'object';
                const memberName = isMemberUserObj ? (member.userId as any).name : 'Member';
                const memberEmail = isMemberUserObj ? (member.userId as any).email : '';

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{memberName}</p>
                        {memberEmail && <p className="text-[10px] text-muted-foreground">{memberEmail}</p>}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-0.5 rounded-md text-foreground">
                      {member.role === 'ADMIN' ? (
                        <ShieldCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
                      )}
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'danger' && isOwner && (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">Delete Workspace</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Once deleted, all conversation channels, chat history, and workspace invites will be permanently removed.
                </p>
              </div>

              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Workspace
                </button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    Are you absolutely sure you want to delete this workspace?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteWorkspace}
                      disabled={deleting}
                      className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
