'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspace } from './WorkspaceContext';
import { api } from '../lib/api';

export interface ConversationGroup {
  _id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationContextType {
  groups: ConversationGroup[];
  activeGroup: ConversationGroup | null;
  loadingGroups: boolean;
  isCreateGroupModalOpen: boolean;
  isInviteModalOpen: boolean;
  isSettingsModalOpen: boolean;
  fetchGroups: (workspaceSlugOrId: string) => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<ConversationGroup>;
  setActiveGroupBySlug: (groupSlug: string) => void;
  openCreateGroupModal: () => void;
  closeCreateGroupModal: () => void;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspace } = useWorkspace();
  const pathname = usePathname();
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ConversationGroup | null>(null);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const fetchGroups = useCallback(async (workspaceSlugOrId: string) => {
    try {
      setLoadingGroups(true);
      const response = await api.get<ConversationGroup[]>(`/conversations/workspace/${workspaceSlugOrId}`);
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch conversation groups', error);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      fetchGroups(activeWorkspace.slug);
    } else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [activeWorkspace, fetchGroups]);

  // Sync activeGroup with URL route: /w/[workspaceSlug]/[groupSlug]
  useEffect(() => {
    if (!pathname || groups.length === 0) return;

    const match = pathname.match(/^\/w\/[^\/]+\/([^\/]+)/);
    if (match && match[1]) {
      const groupSlug = match[1];
      const found = groups.find((g) => g.slug === groupSlug);
      setActiveGroup(found || null);
    } else {
      setActiveGroup(null);
    }
  }, [pathname, groups]);

  const setActiveGroupBySlug = useCallback(
    (groupSlug: string) => {
      const found = groups.find((g) => g.slug === groupSlug);
      setActiveGroup(found || null);
    },
    [groups],
  );

  const createGroup = async (name: string, description?: string): Promise<ConversationGroup> => {
    if (!activeWorkspace) {
      throw new Error('No active workspace selected');
    }

    const response = await api.post<ConversationGroup>(`/conversations/workspace/${activeWorkspace._id}`, {
      name,
      description,
    });
    const newGroup = response.data;
    setGroups((prev) => [...prev, newGroup]);
    setActiveGroup(newGroup);
    setIsCreateGroupModalOpen(false);
    return newGroup;
  };

  return (
    <ConversationContext.Provider
      value={{
        groups,
        activeGroup,
        loadingGroups,
        isCreateGroupModalOpen,
        isInviteModalOpen,
        isSettingsModalOpen,
        fetchGroups,
        createGroup,
        setActiveGroupBySlug,
        openCreateGroupModal: () => setIsCreateGroupModalOpen(true),
        closeCreateGroupModal: () => setIsCreateGroupModalOpen(false),
        openInviteModal: () => setIsInviteModalOpen(true),
        closeInviteModal: () => setIsInviteModalOpen(false),
        openSettingsModal: () => setIsSettingsModalOpen(true),
        closeSettingsModal: () => setIsSettingsModalOpen(false),
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};
