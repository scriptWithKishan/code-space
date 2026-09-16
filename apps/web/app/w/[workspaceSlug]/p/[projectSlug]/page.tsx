'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PrimarySidebar from '../../../../components/PrimarySidebar';
import SecondarySidebar from '../../../../components/SecondarySidebar';
import InviteMemberModal from '../../../../components/InviteMemberModal';
import CreateGroupModal from '../../../../components/CreateGroupModal';
import WorkspaceSettingsModal from '../../../../components/WorkspaceSettingsModal';
import ProjectHeader from '../../../../components/ProjectHeader';
import TopStatsBanner from '../../../../components/TopStatsBanner';
import ProjectSettingsTab from '../../../../components/ProjectSettingsTab';
import { useWorkspace } from '../../../../context/WorkspaceContext';
import { useProject, ProjectStats, ProjectMember } from '../../../../context/ProjectContext';
import { useAuth } from '../../../../context/AuthContext';
import { isWorkspaceAdmin } from '../../../../lib/utils';
import {
  FolderKanban,
  UserX,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  UserMinus,
} from 'lucide-react';
import { api } from '../../../../lib/api';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();

  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const { activeWorkspace, setActiveWorkspaceBySlug, loadingWorkspaces } = useWorkspace();
  const { workspaceProjects, getProjectStats, refreshProjects, removeProjectMember, loadingProjects } = useProject();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'settings'>('tasks');
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [isTasksOverviewCollapsed, setIsTasksOverviewCollapsed] = useState<boolean>(false);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);

  // Quick Task Creation state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    if (workspaceSlug) {
      setActiveWorkspaceBySlug(workspaceSlug);
    }
  }, [workspaceSlug, setActiveWorkspaceBySlug]);

  const targetProject = workspaceProjects.find((p) => p.slug === projectSlug);
  const projectId = targetProject?._id;

  const fetchStats = useCallback(async (showLoading = false) => {
    if (!projectId) return;
    try {
      if (showLoading) setLoadingStats(true);
      const res = await getProjectStats(projectId);
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch project stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, [projectId, getProjectStats]);

  useEffect(() => {
    if (projectId) {
      fetchStats(true);
    }
  }, [projectId, fetchStats]);

  if (authLoading || loadingWorkspaces || loadingProjects) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground text-xs">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        Loading project details...
      </div>
    );
  }

  if (!activeWorkspace || !targetProject) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <PrimarySidebar />
        <SecondarySidebar />
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-3 shadow-xs">
            <UserX className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-foreground">Project Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            The project <span className="font-semibold text-foreground">"{projectSlug}"</span> does not exist or you do not have permission to view it.
          </p>
          <button
            onClick={() => router.push(`/w/${workspaceSlug}`)}
            className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = isWorkspaceAdmin(user, activeWorkspace);

  const membersList: ProjectMember[] = (targetProject.members || []).map((m: any) => {
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      // Create task endpoint integration
      await api.post('/tasks', {
        projectId: targetProject._id,
        workspaceId: activeWorkspace._id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
      });

      setTaskTitle('');
      setTaskDesc('');
      setIsAddTaskModalOpen(false);
      await fetchStats();
      await refreshProjects();
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleKickMember = async (memberUserId: string) => {
    if (!targetProject) return;
    try {
      setKickingMemberId(memberUserId);
      await removeProjectMember(targetProject._id, memberUserId);
      await fetchStats();
      await refreshProjects();
    } catch (err) {
      console.error('Failed to kick member from project', err);
    } finally {
      setKickingMemberId(null);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <PrimarySidebar />
      <SecondarySidebar />

      {/* Main View Panel */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Project Header */}
            <ProjectHeader
              project={targetProject}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isAdmin={isAdmin}
              onAddTask={() => setIsAddTaskModalOpen(true)}
            />

            {/* Embedded Top Stats Banner */}
            <TopStatsBanner stats={stats} loading={loadingStats} />

            {/* Tab Views */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTasksOverviewCollapsed((prev) => !prev)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      title={isTasksOverviewCollapsed ? 'Expand Tasks Overview' : 'Collapse Tasks Overview'}
                    >
                      {isTasksOverviewCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h3 className="text-sm font-bold text-foreground">Project Tasks Overview</h3>
                  </div>
                  <button
                    onClick={() => setIsAddTaskModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Task</span>
                  </button>
                </div>

                {/* Status Columns Overview */}
                {!isTasksOverviewCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                    {[
                      { key: 'TODO', label: 'To Do', icon: Clock, count: stats?.statusBreakdown?.TODO || 0, badge: 'bg-slate-500/10 text-slate-400' },
                      { key: 'IN_PROGRESS', label: 'In Progress', icon: Loader2, count: stats?.statusBreakdown?.IN_PROGRESS || 0, badge: 'bg-blue-500/10 text-blue-500' },
                      { key: 'IN_REVIEW', label: 'In Review', icon: Search, count: stats?.statusBreakdown?.IN_REVIEW || 0, badge: 'bg-amber-500/10 text-amber-500' },
                      { key: 'DONE', label: 'Completed', icon: CheckCircle2, count: stats?.statusBreakdown?.DONE || 0, badge: 'bg-emerald-500/10 text-emerald-500' },
                    ].map((col) => {
                      const ColIcon = col.icon;
                      return (
                        <div key={col.key} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${col.badge}`}>
                                <ColIcon className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-bold text-foreground">{col.label}</span>
                            </div>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {col.count}
                            </span>
                          </div>
                          <div className="min-h-[100px] flex items-center justify-center text-center p-4 rounded-xl border border-dashed border-border/50 bg-muted/20">
                            <p className="text-[11px] text-muted-foreground">
                              {col.count === 0 ? 'No tasks in this stage' : `${col.count} task(s)`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Project Team Members</h3>
                    <p className="text-xs text-muted-foreground">Assigned workspace contributors for this project</p>
                  </div>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {membersList.length} members
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {membersList.map((m, i) => (
                    <div key={m._id || i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:border-border transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0 border border-primary/30">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleKickMember(m._id)}
                          disabled={kickingMemberId === m._id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive hover:text-white transition shrink-0 disabled:opacity-50"
                          title={`Kick out ${m.name} from project`}
                        >
                          {kickingMemberId === m._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          <span>Kick Out</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && isAdmin && (
              <ProjectSettingsTab project={targetProject} />
            )}
          </div>
        </main>
      </div>

      {/* Quick Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create New Task</h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Task Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Auth REST endpoints"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task scope details..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  disabled={creatingTask}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creatingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InviteMemberModal />
      <CreateGroupModal />
      <WorkspaceSettingsModal />
    </div>
  );
}
