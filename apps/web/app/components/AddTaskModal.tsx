'use client';

import React, { useState, useEffect, useId } from 'react';
import { X, Plus, Loader2, GripVertical, UserPlus, UserCheck, Search, CheckSquare } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { api } from '../lib/api';

export interface ProjectMemberItem {
  id: string; // userId
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectMembers: ProjectMemberItem[];
  onTaskCreated: () => void;
}

function DraggableMemberCard({
  member,
  actionType,
  onAction,
}: {
  member: ProjectMemberItem;
  actionType: 'assign' | 'remove';
  onAction: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    data: { member, actionType },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center justify-between p-2 rounded-xl border transition-all select-none w-full min-w-0 ${
        isDragging
          ? 'opacity-30 border-dashed border-primary bg-primary/5'
          : 'border-border/60 bg-background/80 hover:bg-muted/60 hover:border-border'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 shrink-0"
          title="Drag to assign user"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px] shrink-0 border border-primary/20">
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
        className={`ml-1.5 flex h-6 py-1 px-2 items-center justify-center rounded-lg text-[10px] font-semibold transition shrink-0 ${
          actionType === 'assign'
            ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
            : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white'
        }`}
        title={actionType === 'assign' ? 'Assign user' : 'Remove user'}
      >
        {actionType === 'assign' ? 'Assign' : '× Remove'}
      </button>
    </div>
  );
}

function MemberCardOverlay({ member }: { member: ProjectMemberItem }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl border border-primary bg-card text-card-foreground shadow-2xl scale-105 opacity-95 w-56 select-none cursor-grabbing">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <GripVertical className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[11px] shrink-0">
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

export default function AddTaskModal({
  isOpen,
  onClose,
  projectId,
  projectMembers,
  onTaskCreated,
}: AddTaskModalProps) {
  const dndContextId = useId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignedUser, setAssignedUser] = useState<ProjectMemberItem | null>(null);
  const [activeMember, setActiveMember] = useState<ProjectMemberItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setSearch('');
      setError(null);
      setAssignedUser(null);
    }
  }, [isOpen]);

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

  const availableMembers = projectMembers.filter(
    (m) => !assignedUser || m.id !== assignedUser.id
  );

  const filteredAvailable = availableMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssignUser = (member: ProjectMemberItem) => {
    setAssignedUser(member);
  };

  const handleRemoveUser = () => {
    setAssignedUser(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const member = event.active.data.current?.member as ProjectMemberItem;
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

    if (targetZone === 'single-assignee-dropzone') {
      const member = projectMembers.find((m) => m.id === memberId);
      if (member) {
        handleAssignUser(member);
      }
    } else if (targetZone === 'available-members-dropzone') {
      if (assignedUser && assignedUser.id === memberId) {
        handleRemoveUser();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task topic is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.post(`/projects/${projectId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assignedUser ? assignedUser.id : undefined,
      });

      onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create task', err);
      setError(err?.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-hidden">
      <div className="relative w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-2xl transition-all overflow-x-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Create New Task</h2>
              <p className="text-xs text-muted-foreground">Add a project task and assign a single team contributor</p>
            </div>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {/* Task Topic */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Task Topic / Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Auth Flow & OAuth endpoints"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Task Message / Description & Priority Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Task Message / Description <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed scope, context, or requirements..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Task Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition cursor-pointer"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Select priority impact</p>
            </div>
          </div>

          {/* Single-User Drag & Drop Assignee Section */}
          <DndContext
            id={dndContextId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveMember(null)}
          >
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  Assign User <span className="text-muted-foreground font-normal">(Drag single member card or click assign)</span>
                </label>
                <div className="relative w-40">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search project members..."
                    className="w-full rounded-lg border border-input bg-background pl-7 pr-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {/* Available Project Members Zone */}
                <AvailableZone id="available-members-dropzone" count={filteredAvailable.length}>
                  {filteredAvailable.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-28 text-center text-muted-foreground p-2">
                      <p className="text-[11px]">No project members available</p>
                    </div>
                  ) : (
                    filteredAvailable.map((m) => (
                      <DraggableMemberCard
                        key={m.id}
                        member={m}
                        actionType="assign"
                        onAction={() => handleAssignUser(m)}
                      />
                    ))
                  )}
                </AvailableZone>

                {/* Single Assignee Dropzone */}
                <SingleAssigneeZone id="single-assignee-dropzone" assignedUser={assignedUser} onRemove={handleRemoveUser} />
              </div>
            </div>

            <DragOverlay>
              {activeMember ? <MemberCardOverlay member={activeMember} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating Task...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AvailableZone({ id, children, count }: { id: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-2.5 min-h-[150px] transition-all overflow-hidden ${
        isOver ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/60 bg-muted/20'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-semibold text-foreground truncate">Project Team</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[150px] pr-0.5">
        {children}
      </div>
    </div>
  );
}

function SingleAssigneeZone({
  id,
  assignedUser,
  onRemove,
}: {
  id: string;
  assignedUser: ProjectMemberItem | null;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-2.5 min-h-[150px] transition-all overflow-hidden ${
        isOver ? 'border-primary bg-primary/10 ring-2 ring-primary/40' : 'border-border/60 bg-muted/20'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-semibold text-foreground truncate">Assigned User</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
          {assignedUser ? '1 assigned' : '0 assigned'}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-1">
        {assignedUser ? (
          <DraggableMemberCard member={assignedUser} actionType="remove" onAction={onRemove} />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-3 border border-dashed border-border/60 rounded-xl w-full h-full bg-background/50">
            <UserPlus className="h-5 w-5 text-muted-foreground/60 mb-1" />
            <p className="text-[11px] font-medium text-muted-foreground">Drag 1 member here</p>
            <p className="text-[9px] text-muted-foreground/70">Or click 'Assign' on a member card</p>
          </div>
        )}
      </div>
    </div>
  );
}
