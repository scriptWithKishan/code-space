'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import PrimarySidebar from '../../../components/PrimarySidebar';
import SecondarySidebar from '../../../components/SecondarySidebar';
import InviteMemberModal from '../../../components/InviteMemberModal';
import CreateGroupModal from '../../../components/CreateGroupModal';
import WorkspaceSettingsModal from '../../../components/WorkspaceSettingsModal';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useConversation } from '../../../context/ConversationContext';
import { useAuth } from '../../../context/AuthContext';
import { isWorkspaceAdmin } from '../../../lib/utils';
import { api } from '../../../lib/api';
import { Hash, Send, Paperclip, Smile, Loader2, UserPlus } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  _id: string;
  conversationId: string;
  workspaceId: string;
  senderId: { _id: string; name: string; email: string; avatarUrl?: string } | string;
  content: string;
  attachments?: { url: string; fileName: string }[];
  createdAt: string;
}

export default function GroupChatPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const groupSlug = params.groupSlug as string;

  const { activeWorkspace, setActiveWorkspaceBySlug } = useWorkspace();
  const { groups, activeGroup, setActiveGroupBySlug, openInviteModal } = useConversation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (workspaceSlug) {
      setActiveWorkspaceBySlug(workspaceSlug);
    }
  }, [workspaceSlug, setActiveWorkspaceBySlug]);

  useEffect(() => {
    if (groupSlug && groups.length > 0) {
      setActiveGroupBySlug(groupSlug);
    }
  }, [groupSlug, groups, setActiveGroupBySlug]);

  // Fetch message history for active group
  useEffect(() => {
    if (!activeGroup) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await api.get<ChatMessage[]>(`/conversations/group/${activeGroup._id}/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to load message history', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeGroup]);

  // Real-time WebSockets room subscription & live message listener
  useEffect(() => {
    if (!activeGroup) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinGroup', { groupId: activeGroup._id });
    });

    socket.on('message:received', (newMsg: ChatMessage) => {
      if (newMsg.conversationId === activeGroup._id) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(newMsg._id))) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      socket.emit('leaveGroup', { groupId: activeGroup._id });
      socket.disconnect();
    };
  }, [activeGroup]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || !activeGroup || sending) return;

    const content = inputContent.trim();
    setInputContent('');

    try {
      setSending(true);
      const response = await api.post<ChatMessage>(`/conversations/group/${activeGroup._id}/messages`, {
        content,
      });

      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(response.data._id))) return prev;
        return [...prev, response.data];
      });
    } catch (error) {
      console.error('Failed to send message', error);
      // Restore input on failure
      setInputContent(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isAdmin = isWorkspaceAdmin(user, activeWorkspace);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <PrimarySidebar />
      <SecondarySidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Chat Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 border border-primary/30">
              <Hash className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold text-foreground tracking-tight truncate leading-tight">
                #{activeGroup?.name || groupSlug}
              </h1>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {activeGroup?.description || 'Workspace discussion channel'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={openInviteModal}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
            >
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              <span>Invite</span>
            </button>
          )}
        </header>

        {/* Message History Stream */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-8 space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-2">
                <Hash className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Welcome to #{activeGroup?.name || groupSlug}!</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                This is the start of the <span className="font-semibold text-foreground">#{activeGroup?.name}</span> channel. Send a message to start the discussion with your team.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isSenderObj = typeof msg.senderId === 'object' && msg.senderId !== null;
              const senderName = isSenderObj ? (msg.senderId as any).name : 'Member';
              const senderAvatar = isSenderObj ? (msg.senderId as any).avatarUrl : null;
              const isMe = user && (isSenderObj ? (msg.senderId as any)._id === user.id : msg.senderId === user.id);

              return (
                <div
                  key={msg._id ? String(msg._id) : `msg-${idx}`}
                  className={`flex space-x-3 text-left ${
                    isMe ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  {senderAvatar ? (
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="h-8 w-8 rounded-full object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                        isMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground border border-border'
                      }`}
                    >
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-md ${isMe ? 'items-end text-right' : 'items-start'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[11px] font-semibold text-foreground">{senderName}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-xs'
                          : 'bg-card border border-border text-foreground rounded-tl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Message Bar Input Area */}
        <div className="p-4 border-t border-border bg-card/60 backdrop-blur-md shrink-0">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${activeGroup?.name || 'group'}... (Press Enter to send, Shift+Enter for newline)`}
              rows={1}
              className="w-full rounded-xl border border-input bg-background pl-4 pr-12 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none max-h-24"
            />
            <button
              type="submit"
              disabled={!inputContent.trim() || sending}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40"
              title="Send Message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>

      <InviteMemberModal />
      <CreateGroupModal />
      <WorkspaceSettingsModal />
    </div>
  );
}
