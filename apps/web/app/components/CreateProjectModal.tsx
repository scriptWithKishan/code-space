'use client';

import React, { useState, useEffect, useId } from 'react';
import { X, Plus, Loader2, FolderPlus, Search, UserCheck, UserPlus, GripVertical } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProject } from '../context/ProjectContext';
import { useRouter } from 'next/navigation';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { api } from '../lib/api';

interface MemberItem {
  id: string; // userId
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

function DraggableMemberCard({ member, actionType, onAction }: { member: MemberItem; actionType: 'add' | 'remove'; onAction: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    data: { member, actionType },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all select-none w-full min-w-0 ${
        isDragging
          ? 'opacity-30 border-dashed border-primary bg-primary/5'
          : 'border-border/60 bg-background/80 hover:bg-muted/60 hover:border-border'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 shrink-0"
          title="Drag to assign"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAction}
        className={`ml-2 flex h-7 w-7 items-center justify-center rounded-lg transition shrink-0 ${
          actionType === 'add'
            ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
            : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white'
        }`}
        title={actionType === 'add' ? 'Add member' : 'Remove member'}
      >
        {actionType === 'add' ? <Plus className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function MemberCardOverlay({ member }: { member: MemberItem }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary bg-card text-card-foreground shadow-2xl scale-105 opacity-95 w-64 select-none cursor-grabbing">
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        <GripVertical className="h-4 w-4 text-primary shrink-0" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shrink-0">
          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>
    </div>
  );
}

function DropzoneColumn({ id, title, icon: Icon, children, count }: { id: string; title: string; icon: any; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full min-w-0 rounded-2xl border p-3 min-h-[220px] transition-all overflow-hidden ${
        isOver ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/60 bg-muted/20'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">{title}</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden max-h-[220px] pr-1">
        {children}
      </div>
    </div>
  );
}

export default function CreateProjectModal() {
  const { activeWorkspace } = useWorkspace();
  const { isCreateProjectModalOpen, closeCreateProjectModal, createProject } = useProject();
  const router = useRouter();
  const dndContextId = useId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableMembers, setAvailableMembers] = useState<MemberItem[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<MemberItem[]>([]);
  const [activeMember, setActiveMember] = useState<MemberItem | null>(null);

  useEffect(() => {
    if (!activeWorkspace || !isCreateProjectModalOpen) return;

    let isMounted = true;
    api
      .get(`/workspaces/${activeWorkspace._id}/members`)
      .then((res) => {
        if (!isMounted) return;
        const fetchedMembers: MemberItem[] = res.data.map((m: any) => {
          const u = typeof m.userId === 'object' && m.userId !== null ? m.userId : { _id: m.userId, name: 'Member', email: '' };
          return {
            id: u._id || m.userId,
            name: u.name || 'Member',
            email: u.email || '',
            avatarUrl: u.avatarUrl,
            role: m.role,
          };
        });

        setAvailableMembers(fetchedMembers);
        setAssignedMembers([]);
      })
      .catch((err) => {
        console.error('Failed to load workspace members for project modal', err);
        if (!isMounted) return;
        const fallbackList: MemberItem[] = activeWorkspace.members.map((m: any) => {
          const u = typeof m.userId === 'object' && m.userId !== null ? m.userId : { _id: m.userId, name: 'Member', email: '' };
          return {
            id: u._id || m.userId,
            name: u.name || 'Member',
            email: u.email || '',
            role: m.role,
          };
        });
        setAvailableMembers(fallbackList);
        setAssignedMembers([]);
      });

    return () => {
      isMounted = false;
    };
  }, [activeWorkspace, isCreateProjectModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateProjectModalOpen) {
        closeCreateProjectModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateProjectModalOpen, closeCreateProjectModal]);

  if (!isCreateProjectModalOpen) return null;

  const handleAddMember = (member: MemberItem) => {
    setAvailableMembers((prev) => prev.filter((m) => m.id !== member.id));
    setAssignedMembers((prev) => [...prev, member]);
  };

  const handleRemoveMember = (member: MemberItem) => {
    setAssignedMembers((prev) => prev.filter((m) => m.id !== member.id));
    setAvailableMembers((prev) => [...prev, member]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const member = event.active.data.current?.member as MemberItem;
    if (member) {
      setActiveMember(member);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMember(null);
    if (!over) return;

    const memberId = active.id as string;
    const targetZone = over.id as string;

    if (targetZone === 'assigned-zone') {
      const member = availableMembers.find((m) => m.id === memberId);
      if (member) handleAddMember(member);
    } else if (targetZone === 'available-zone') {
      const member = assignedMembers.find((m) => m.id === memberId);
      if (member) handleRemoveMember(member);
    }
  };

  const filteredAvailable = availableMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const assignedIds = assignedMembers.map((m) => m.id);
      const project = await createProject(name.trim(), description.trim() || undefined, assignedIds);
      
      setName('');
      setDescription('');
      closeCreateProjectModal();

      if (activeWorkspace) {
        router.push(`/w/${activeWorkspace.slug}/p/${project.slug}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-hidden">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl transition-all overflow-x-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Create New Project</h2>
              <p className="text-xs text-muted-foreground">Organize tasks and assign workspace team members</p>
            </div>
          </div>
          <button
            onClick={closeCreateProjectModal}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Project Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile App Redesign"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                required
                maxLength={60}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Description <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief project goals..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                maxLength={300}
              />
            </div>
          </div>

          {/* Drag & Drop Member Assignment Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground">
                Assign Members <span className="text-muted-foreground font-normal">(Drag & drop cards or click buttons)</span>
              </label>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <DndContext id={dndContextId} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveMember(null)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full overflow-hidden">
                {/* Available Workspace Members */}
                <DropzoneColumn id="available-zone" title="Workspace Members" icon={UserPlus} count={filteredAvailable.length}>
                  {filteredAvailable.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground p-2">
                      <p className="text-xs">No workspace members found</p>
                    </div>
                  ) : (
                    filteredAvailable.map((m) => (
                      <DraggableMemberCard key={m.id} member={m} actionType="add" onAction={() => handleAddMember(m)} />
                    ))
                  )}
                </DropzoneColumn>

                {/* Assigned Project Team */}
                <DropzoneColumn id="assigned-zone" title="Project Team" icon={UserCheck} count={assignedMembers.length}>
                  {assignedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground p-2">
                      <p className="text-xs">Drag members here to assign</p>
                      <p className="text-[10px] text-muted-foreground/70">Or click the + icon on a member card</p>
                    </div>
                  ) : (
                    assignedMembers.map((m) => (
                      <DraggableMemberCard key={m.id} member={m} actionType="remove" onAction={() => handleRemoveMember(m)} />
                    ))
                  )}
                </DropzoneColumn>
              </div>

              {/* Portal Drag Overlay prevents column widening and horizontal scroll */}
              <DragOverlay>
                {activeMember ? <MemberCardOverlay member={activeMember} /> : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={closeCreateProjectModal}
              disabled={submitting}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
