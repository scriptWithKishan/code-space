'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

export interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actionsExecuted?: Array<{ actionType: string; targetId?: string; summary: string }>;
  timestamp: Date;
}

interface AIContextType {
  isDrawerOpen: boolean;
  isCmdKOpen: boolean;
  messages: AIMessage[];
  executing: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openCmdK: () => void;
  closeCmdK: () => void;
  toggleCmdK: () => void;
  executePrompt: (promptText: string) => Promise<void>;
  clearHistory: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const router = useRouter();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your AI Assistant. Ask me to create workspaces or invite team members using natural language prompts.',
      timestamp: new Date(),
    },
  ]);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const openCmdK = () => setIsCmdKOpen(true);
  const closeCmdK = () => setIsCmdKOpen(false);
  const toggleCmdK = () => setIsCmdKOpen((prev) => !prev);

  const clearHistory = () => {
    setMessages([
      {
        id: 'welcome-1',
        sender: 'ai',
        text: 'History cleared. How can I assist you with workspaces or invitations?',
        timestamp: new Date(),
      },
    ]);
  };

  const executePrompt = async (promptText: string) => {
    if (!promptText.trim() || executing) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setExecuting(true);

    try {
      const response = await api.post<{
        summary: string;
        actionsExecuted: Array<{ actionType: string; targetId?: string; summary: string }>;
        auditLogId: string;
        createdWorkspaceSlug?: string;
      }>('/ai/execute', {
        prompt: promptText.trim(),
        workspaceId: activeWorkspace?._id,
      });

      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.data.summary,
        actionsExecuted: response.data.actionsExecuted,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Live update workspace context
      await refreshWorkspaces();

      // Navigate if a new workspace was created
      if (response.data.createdWorkspaceSlug) {
        router.push(`/w/${response.data.createdWorkspaceSlug}`);
      }
    } catch (error: any) {
      console.error('AI execution error', error);
      const errorMsg: AIMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: error?.response?.data?.message || 'Failed to process AI prompt. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AIContext.Provider
      value={{
        isDrawerOpen,
        isCmdKOpen,
        messages,
        executing,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        openCmdK,
        closeCmdK,
        toggleCmdK,
        executePrompt,
        clearHistory,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
