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
import AddTaskModal from '../../../../components/AddTaskModal';
import BorderlessTaskTable from '../../../../components/BorderlessTaskTable';
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
  Calendar,
} from 'lucide-react';
import TaskDetailModal, { TaskItem } from '../../../../components/TaskDetailModal';
import { api } from '../../../../lib/api';

const priorityCardStyles: Record<string, string> = {
  LOW: 'border-slate-500/30 bg-slate-500/5 hover:border-slate-500/60',
  MEDIUM: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60',
  HIGH: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60',
  URGENT: 'border-rose-500/30 bg-rose-500/10 hover:border-rose-500/60',
};

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

  // Overview Tasks state
  const [overviewTasks, setOverviewTasks] = useState<TaskItem[]>([]);
  const [loadingOverviewTasks, setLoadingOverviewTasks] = useState<boolean>(true);

  // Task Detail Modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Add Task Modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

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

  const fetchOverviewTasks = useCallback(async (showLoading = false) => {
    if (!projectId) return;
    try {
      if (showLoading) setLoadingOverviewTasks(true);
      const res = await api.get(`/projects/${projectId}/tasks?limit=100`);
      setOverviewTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch overview tasks', err);
    } finally {
      setLoadingOverviewTasks(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchStats(true);
      fetchOverviewTasks(true);
    }
  }, [projectId, fetchStats, fetchOverviewTasks]);

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

            {/* Tab Views */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                {/* Embedded Top Stats Banner */}
                <TopStatsBanner stats={stats} loading={loadingStats} />

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
                      const stageTasks = overviewTasks.filter((t) => t.status === col.key);

                      return (
                        <div key={col.key} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-xs flex flex-col">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0">
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

                          {/* Scrollable Tasks Container inside Card */}
                          <div className="max-h-[280px] min-h-[120px] overflow-y-auto space-y-1.5 pr-1 flex-1">
                            {loadingOverviewTasks ? (
                              <div className="space-y-1.5 py-1">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="h-9 rounded-xl bg-muted/40 animate-pulse border border-border/30" />
                                ))}
                              </div>
                            ) : stageTasks.length === 0 ? (
                              <div className="h-28 flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-border/50 bg-muted/20">
                                <p className="text-[11px] text-muted-foreground">No tasks in this stage</p>
                              </div>
                            ) : (
                              stageTasks.map((task) => (
                                <div
                                  key={task._id}
                                  onClick={() => {
                                    setSelectedTaskId(task._id);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className={`group flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 shadow-2xs hover:shadow-xs transition cursor-pointer ${
                                    priorityCardStyles[task.priority] || priorityCardStyles.MEDIUM
                                  }`}
                                  title={task.title}
                                >
                                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition truncate min-w-0 flex-1">
                                    {task.title}
                                  </span>

                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
                                      <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                      <span>
                                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Borderless Task Table Component */}
                <div className="pt-2">
                  <BorderlessTaskTable
                    key={refreshKey}
                    projectId={targetProject._id}
                    isAdmin={isAdmin}
                    currentUserId={user?.id || (user as any)?._id || ''}
                    onStatsRefresh={() => {
                      fetchStats();
                      fetchOverviewTasks();
                    }}
                  />
                </div>
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

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        projectId={targetProject._id}
        projectMembers={membersList.map((m) => ({
          id: m._id,
          name: m.name,
          email: m.email,
          avatarUrl: m.avatarUrl,
        }))}
        onTaskCreated={async () => {
          await fetchStats();
          await fetchOverviewTasks();
          await refreshProjects();
          setRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Task Detail Modal for Overview */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        taskId={selectedTaskId}
        isAdmin={isAdmin}
        currentUserId={user?.id || (user as any)?._id || ''}
        onTaskUpdated={() => {
          fetchStats();
          fetchOverviewTasks();
          setRefreshKey((prev) => prev + 1);
        }}
      />

      <InviteMemberModal />
      <CreateGroupModal />
      <WorkspaceSettingsModal />
    </div>
  );
}
