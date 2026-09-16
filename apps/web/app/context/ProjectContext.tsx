'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  members: (string | ProjectMember)[];
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  highUrgentTasksCount: number;
  teamCount: number;
  statusBreakdown: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  priorityBreakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
}

interface ProjectContextType {
  workspaceProjects: Project[];
  recentProjects: Project[];
  activeProject: Project | null;
  loadingProjects: boolean;
  isCreateProjectModalOpen: boolean;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string, memberIds?: string[]) => Promise<Project>;
  updateProject: (projectId: string, data: { name?: string; description?: string; status?: string; memberIds?: string[] }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  addProjectMembers: (projectId: string, memberIds: string[]) => Promise<Project>;
  removeProjectMember: (projectId: string, memberUserId: string) => Promise<Project>;
  getProjectStats: (projectId: string) => Promise<ProjectStats>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace, loadingWorkspaces } = useWorkspace();
  const pathname = usePathname();

  const [workspaceProjects, setWorkspaceProjects] = useState<Project[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);

  const fetchWorkspaceProjects = useCallback(async () => {
    if (!activeWorkspace) {
      setWorkspaceProjects([]);
      return;
    }
    try {
      const res = await api.get<Project[]>(`/workspaces/${activeWorkspace._id}/projects`);
      setWorkspaceProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch workspace projects', err);
    }
  }, [activeWorkspace]);

  const fetchRecentProjects = useCallback(async () => {
    if (!user) {
      setRecentProjects([]);
      return;
    }
    try {
      const res = await api.get<Project[]>('/projects/recent');
      setRecentProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch recent projects', err);
    }
  }, [user]);

  const refreshProjects = useCallback(async () => {
    if (authLoading || loadingWorkspaces) {
      setLoadingProjects(true);
      return;
    }

    setLoadingProjects(true);
    await Promise.all([fetchWorkspaceProjects(), fetchRecentProjects()]);
    setLoadingProjects(false);
  }, [authLoading, loadingWorkspaces, fetchWorkspaceProjects, fetchRecentProjects]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Sync active project with URL route `/w/[workspaceSlug]/p/[projectSlug]`
  useEffect(() => {
    if (!pathname) return;
    const match = pathname.match(/\/p\/([^\/]+)/);
    if (match && match[1]) {
      const pSlug = match[1];
      const found = workspaceProjects.find((p) => p.slug === pSlug);
      if (found) {
        setActiveProject((prev) => (prev?._id === found._id ? prev : found));
      } else if (activeWorkspace) {
        // Fetch project directly if not in current list
        api.get<Project[]>(`/workspaces/${activeWorkspace._id}/projects`)
          .then((res) => {
            const p = res.data.find((item) => item.slug === pSlug);
            setActiveProject((prev) => (prev?._id === p?._id ? prev : p || null));
          })
          .catch(() => setActiveProject(null));
      }
    } else {
      setActiveProject(null);
    }
  }, [pathname, workspaceProjects, activeWorkspace]);

  const openCreateProjectModal = () => setIsCreateProjectModalOpen(true);
  const closeCreateProjectModal = () => setIsCreateProjectModalOpen(false);

  const createProject = async (name: string, description?: string, memberIds?: string[]): Promise<Project> => {
    if (!activeWorkspace) throw new Error('No active workspace selected');
    const res = await api.post<Project>(`/workspaces/${activeWorkspace._id}/projects`, {
      name,
      description,
      memberIds,
    });
    await refreshProjects();
    return res.data;
  };

  const updateProject = async (projectId: string, data: { name?: string; description?: string; status?: string; memberIds?: string[] }): Promise<Project> => {
    const res = await api.patch<Project>(`/projects/${projectId}`, data);
    await refreshProjects();
    return res.data;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
    await refreshProjects();
  };

  const addProjectMembers = async (projectId: string, memberIds: string[]): Promise<Project> => {
    const res = await api.post<Project>(`/projects/${projectId}/members`, { memberIds });
    await refreshProjects();
    return res.data;
  };

  const removeProjectMember = async (projectId: string, memberUserId: string): Promise<Project> => {
    const res = await api.delete<Project>(`/projects/${projectId}/members/${memberUserId}`);
    await refreshProjects();
    return res.data;
  };

  const getProjectStats = useCallback(async (projectId: string): Promise<ProjectStats> => {
    const res = await api.get<ProjectStats>(`/projects/${projectId}/stats`);
    return res.data;
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        workspaceProjects,
        recentProjects,
        activeProject,
        loadingProjects,
        isCreateProjectModalOpen,
        openCreateProjectModal,
        closeCreateProjectModal,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,
        addProjectMembers,
        removeProjectMember,
        getProjectStats,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
