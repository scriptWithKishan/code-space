'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Settings,
  Users,
  Trash2,
  Save,
  Loader2,
  ShieldCheck,
  User,
  UserMinus,
  AlertTriangle,
  Hash,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useConversation } from '../context/ConversationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function WorkspaceSettingsModal() {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { isSettingsModalOpen, closeSettingsModal, groups, fetchGroups } = useConversation();
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'channels' | 'delete'>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [membersList, setMembersList] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [confirmKickMember, setConfirmKickMember] = useState<{ id: string; name: string } | null>(null);

  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState<{ id: string; name: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUserId = user ? user.id || (user as any)._id : null;
  const ownerIdStr = activeWorkspace
    ? typeof activeWorkspace.ownerId === 'object'
      ? (activeWorkspace.ownerId as any)._id
      : activeWorkspace.ownerId
    : null;

  const isOwner = Boolean(currentUserId && ownerIdStr === currentUserId);
  const currentUserMember = activeWorkspace?.members?.find((m) => {
    const mUserId = typeof m.userId === 'object' ? (m.userId as any)._id : m.userId;
    return mUserId === currentUserId;
  });
  const isAdmin = isOwner || currentUserMember?.role === 'ADMIN';

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace?._id) return;
    try {
      setLoadingMembers(true);
      const response = await api.get(`/workspaces/${activeWorkspace._id}/members`);
      setMembersList(response.data);
    } catch (err: any) {
      console.error('Failed to fetch workspace members', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [activeWorkspace?._id]);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || '');
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (isSettingsModalOpen && activeWorkspace?._id) {
      fetchMembers();
      setError(null);
      setSuccess(null);
      setShowConfirmDelete(false);
      setConfirmKickMember(null);
      setConfirmDeleteChannel(null);
    }
  }, [isSettingsModalOpen, activeWorkspace?._id, fetchMembers]);

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

  const handleKickMember = async (memberUserId: string) => {
    try {
      setKickingId(memberUserId);
      setError(null);
      setSuccess(null);

      const response = await api.delete(
        `/workspaces/${activeWorkspace._id}/members/${memberUserId}`,
      );
      setMembersList(response.data);
      await refreshWorkspaces();
      setSuccess('Member kicked out of workspace.');
      setConfirmKickMember(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to kick member.');
    } finally {
      setKickingId(null);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!activeWorkspace) return;
    try {
      setDeletingChannelId(channelId);
      setError(null);
      setSuccess(null);

      await api.delete(`/conversations/group/${channelId}`);
      await fetchGroups(activeWorkspace.slug);
      setSuccess('Channel deleted successfully.');
      setConfirmDeleteChannel(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to delete channel.');
    } finally {
      setDeletingChannelId(null);
    }
  };

  const displayMembers = membersList.length > 0 ? membersList : activeWorkspace.members;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-2xl transition-all">
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
            onClick={() => {
              setActiveTab('general');
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            General
          </button>
          <button
            onClick={() => {
              setActiveTab('members');
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'members'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Members ({displayMembers.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('channels');
              setError(null);
              setSuccess(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === 'channels'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            Channels ({groups.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('delete');
                setError(null);
                setSuccess(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition ${
                activeTab === 'delete'
                  ? 'border-destructive text-destructive font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-destructive'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Workspace
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 min-h-[240px]">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="text-emerald-600/70 hover:text-emerald-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* GENERAL TAB */}
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

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Loading workspace members...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {displayMembers.map((member, idx) => {
                    const isUserObj = typeof member.userId === 'object' && member.userId !== null;
                    const memberUserIdStr = isUserObj ? member.userId._id : member.userId;
                    const memberName = isUserObj ? member.userId.name : 'Workspace Member';
                    const memberEmail = isUserObj ? member.userId.email : '';
                    const memberAvatar = isUserObj ? member.userId.avatarUrl : null;

                    const isMemberOwner = Boolean(ownerIdStr && memberUserIdStr === ownerIdStr);
                    const isSelf = Boolean(currentUserId && memberUserIdStr === currentUserId);
                    const canKick = isAdmin && !isMemberOwner && !isSelf;

                    return (
                      <div
                        key={member._id || idx}
                        className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0">
                            {memberAvatar ? (
                              <img
                                src={memberAvatar}
                                alt={memberName}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-border"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                                {memberName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-foreground truncate">{memberName}</p>
                                {isSelf && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.2 bg-primary/10 text-primary rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              {memberEmail && <p className="text-[10px] text-muted-foreground truncate">{memberEmail}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isMemberOwner && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">
                                OWNER
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-background border border-border px-2 py-0.5 rounded-md text-foreground">
                              {member.role === 'ADMIN' ? (
                                <ShieldCheck className="h-3 w-3 text-primary" />
                              ) : (
                                <User className="h-3 w-3 text-muted-foreground" />
                              )}
                              {member.role}
                            </span>

                            {canKick && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmKickMember({ id: memberUserIdStr, name: memberName })
                                }
                                disabled={kickingId === memberUserIdStr}
                                className="flex items-center gap-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 transition disabled:opacity-50"
                                title={`Kick ${memberName} from workspace`}
                              >
                                {kickingId === memberUserIdStr ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserMinus className="h-3 w-3" />
                                )}
                                <span>Kick out</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Confirmation dialog for kicking */}
                        {confirmKickMember?.id === memberUserIdStr && (
                          <div className="mt-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
                            <span className="text-foreground text-[11px]">
                              Kick <strong className="font-semibold">{memberName}</strong> out of workspace?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleKickMember(memberUserIdStr)}
                                disabled={kickingId === memberUserIdStr}
                                className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground hover:bg-destructive/90 transition shadow-xs disabled:opacity-50"
                              >
                                {kickingId === memberUserIdStr ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Confirm Kick'
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmKickMember(null)}
                                className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CHANNELS TAB */}
          {activeTab === 'channels' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Workspace Channels ({groups.length})
                </p>
                {isAdmin ? (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                    Admin privileges: Channel deletion enabled
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                    View only
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No channels found in this workspace.
                  </div>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group._id}
                      className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 border border-primary/30">
                            <Hash className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-foreground truncate">#{group.name}</p>
                              {group.isDefault && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-[10px] text-muted-foreground truncate">{group.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAdmin && !group.isDefault ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteChannel({ id: group._id, name: group.name })
                              }
                              disabled={deletingChannelId === group._id}
                              className="flex items-center gap-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 transition disabled:opacity-50"
                              title={`Delete #${group.name} channel`}
                            >
                              {deletingChannelId === group._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              <span>Delete</span>
                            </button>
                          ) : group.isDefault ? (
                            <span className="text-[10px] text-muted-foreground italic px-2 py-1">
                              System Default
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Confirmation dialog for channel deletion */}
                      {confirmDeleteChannel?.id === group._id && (
                        <div className="mt-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
                          <span className="text-foreground text-[11px]">
                            Delete <strong className="font-semibold">#{group.name}</strong>? All channel messages will be deleted.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteChannel(group._id)}
                              disabled={deletingChannelId === group._id}
                              className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground hover:bg-destructive/90 transition shadow-xs disabled:opacity-50"
                            >
                              {deletingChannelId === group._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Confirm Delete'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteChannel(null)}
                              className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DELETE WORKSPACE TAB */}
          {activeTab === 'delete' && isAdmin && (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Delete Workspace</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deleting <strong className="text-foreground">{activeWorkspace.name}</strong> will permanently delete all channels, messages, invitations, and workspace data. This action cannot be undone.
                </p>
              </div>

              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Workspace
                </button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    Are you absolutely sure you want to delete <span className="font-bold">{activeWorkspace.name}</span>?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteWorkspace}
                      disabled={deleting}
                      className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-xs disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Confirm Delete
                    </button>
                    <button
                      type="button"
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
