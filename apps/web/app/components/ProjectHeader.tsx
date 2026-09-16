'use client';

import React from 'react';
import { Project, ProjectMember } from '../context/ProjectContext';
import { FolderKanban, Users, Settings, Plus, Sparkles } from 'lucide-react';
import { useAI } from '../context/AIContext';

interface ProjectHeaderProps {
  project: Project;
  activeTab: 'tasks' | 'members' | 'settings';
  setActiveTab: (tab: 'tasks' | 'members' | 'settings') => void;
  isAdmin: boolean;
  onAddTask: () => void;
}

export default function ProjectHeader({
  project,
  activeTab,
  setActiveTab,
  isAdmin,
  onAddTask,
}: ProjectHeaderProps) {
  const { openDrawer } = useAI();

  const membersList: ProjectMember[] = (project.members || []).map((m: any) => {
    if (typeof m === 'object' && m !== null) {
      return {
        _id: m._id || m.id,
        name: m.name || 'Member',
        email: m.email || '',
        avatarUrl: m.avatarUrl,
      };
    }
    return { _id: String(m), name: 'Member', email: '' };
  });

  return (
    <div className="space-y-4 pb-2 border-b border-border">
      {/* Top Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shrink-0 shadow-xs">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight truncate">{project.name}</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  project.status === 'COMPLETED'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                    : project.status === 'ARCHIVED'
                    ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                }`}
              >
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-2xl">{project.description}</p>
            )}
          </div>
        </div>

        {/* Member Avatars & Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Member Avatar Stack */}
          {membersList.length > 0 && (
            <div className="flex items-center -space-x-2 overflow-hidden px-1">
              {membersList.slice(0, 5).map((m, idx) => (
                <div
                  key={m._id || idx}
                  title={`${m.name} (${m.email})`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary border-2 border-background text-xs font-bold shrink-0 shadow-xs"
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {membersList.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground border-2 border-background text-[10px] font-bold shrink-0">
                  +{membersList.length - 5}
                </div>
              )}
            </div>
          )}

          <button
            onClick={openDrawer}
            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-2xs"
            title="Ask AI Assistant"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>AI Assist</span>
          </button>

          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 pt-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'tasks'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-2xs'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
        >
          <FolderKanban className="h-3.5 w-3.5" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'members'
              ? 'bg-primary/15 text-primary border border-primary/30 shadow-2xs'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Team Members ({membersList.length})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'settings'
                ? 'bg-primary/15 text-primary border border-primary/30 shadow-2xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
