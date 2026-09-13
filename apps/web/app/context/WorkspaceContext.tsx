'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { io } from 'socket.io-client';
import { UserX, LogOut } from 'lucide-react';

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
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [kickedNotice, setKickedNotice] = useState<{ workspaceName: string } | null>(null);

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
    if (match && match[1]) {
      const slug = match[1];
      const found = workspaces.find((w) => w.slug === slug);
      setActiveWorkspace(found || null);
    } else if (!pathname.startsWith('/w/')) {
      setActiveWorkspace(null);
    }
  }, [pathname, workspaces]);

  // Real-time listener for member:kicked event
  useEffect(() => {
    if (!activeWorkspace || !user) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
    });

    const currentUserId = user.id || (user as any)._id;

    socket.on('connect', () => {
      socket.emit('joinWorkspace', { workspaceId: activeWorkspace._id });
    });

    socket.on('member:kicked', (data: { workspaceId: string; kickedUserId: string }) => {
      if (data.workspaceId === activeWorkspace._id && data.kickedUserId === currentUserId) {
        setKickedNotice({ workspaceName: activeWorkspace.name });
        setActiveWorkspace(null);
        refreshWorkspaces();
      }
    });

    return () => {
      socket.emit('leaveWorkspace', { workspaceId: activeWorkspace._id });
      socket.disconnect();
    };
  }, [activeWorkspace, user, refreshWorkspaces]);

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

  const handleAcknowledgeKicked = () => {
    setKickedNotice(null);
    router.push('/');
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

      {/* Real-time Kicked Out Modal Overlay */}
      {kickedNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-destructive/30 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/30 shadow-xs">
              <UserX className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-foreground tracking-tight">You have been kicked out</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A workspace administrator has removed you from <span className="font-semibold text-foreground">{kickedNotice.workspaceName}</span>. You no longer have access to this workspace.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAcknowledgeKicked}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
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
