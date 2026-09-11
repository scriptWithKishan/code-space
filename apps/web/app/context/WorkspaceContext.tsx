'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export interface WorkspaceMember {
  userId: string | { _id: string; name: string; email: string; avatarUrl?: string };
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  isCreateModalOpen: boolean;
  refreshWorkspaces: () => Promise<void>;
  setActiveWorkspaceBySlug: (slug: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoadingWorkspaces(false);
      return;
    }

    try {
      setLoadingWorkspaces(true);
      const response = await api.get<Workspace[]>('/workspaces');
      setWorkspaces(response.data);

      setActiveWorkspace((prev) => {
        if (!prev) return null;
        return response.data.find((w) => w.slug === prev.slug || w._id === prev._id) || null;
      });
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  // Sync activeWorkspace with current URL route
  useEffect(() => {
    if (!pathname) return;

    const match = pathname.match(/^\/w\/([^\/]+)/);
    if (match && match[1] && workspaces.length > 0) {
      const slug = match[1];
      const found = workspaces.find((w) => w.slug === slug);
      setActiveWorkspace(found || null);
    } else if (!pathname.startsWith('/w/')) {
      setActiveWorkspace(null);
    }
  }, [pathname, workspaces]);

  const setActiveWorkspaceBySlug = useCallback(
    (slug: string) => {
      const found = workspaces.find((w) => w.slug === slug);
      setActiveWorkspace(found || null);
    },
    [workspaces],
  );

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const createWorkspace = async (name: string, description?: string): Promise<Workspace> => {
    const response = await api.post<Workspace>('/workspaces', { name, description });
    const newWs = response.data;
    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspace(newWs);
    closeCreateModal();
    return newWs;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        isCreateModalOpen,
        refreshWorkspaces,
        setActiveWorkspaceBySlug,
        openCreateModal,
        closeCreateModal,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
