'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PrimarySidebar from '../../components/PrimarySidebar';
import SecondarySidebar from '../../components/SecondarySidebar';
import InviteMemberModal from '../../components/InviteMemberModal';
import CreateGroupModal from '../../components/CreateGroupModal';
import WorkspaceSettingsModal from '../../components/WorkspaceSettingsModal';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useConversation } from '../../context/ConversationContext';
import { useAuth } from '../../context/AuthContext';
import { useAI } from '../../context/AIContext';
import { isWorkspaceAdmin } from '../../lib/utils';
import { Sparkles, Hash, UserPlus, ArrowRight, Building2, MessageSquare, UserX } from 'lucide-react';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;

  const { activeWorkspace, setActiveWorkspaceBySlug, loadingWorkspaces, workspaces, refreshWorkspaces } = useWorkspace();
  const { groups, openInviteModal, openCreateGroupModal } = useConversation();
  const { user } = useAuth();
  const { openDrawer } = useAI();

  useEffect(() => {
    if (workspaceSlug) {
      setActiveWorkspaceBySlug(workspaceSlug);
    }
  }, [workspaceSlug, setActiveWorkspaceBySlug, workspaces]);

  if (loadingWorkspaces) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground text-xs">
        Loading workspace...
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <PrimarySidebar />
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-3 shadow-xs">
            <UserX className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-foreground">You don't have access to this workspace</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            You may have been kicked out of <span className="font-semibold text-foreground">"{workspaceSlug}"</span> or you do not have permission to view it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = isWorkspaceAdmin(user, activeWorkspace);

  const defaultGroup = groups.find((g) => g.isDefault) || groups[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <PrimarySidebar />
      <SecondarySidebar />

      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-sm shrink-0 border border-primary/30">
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">{activeWorkspace.name}</h1>
              <p className="text-[10px] text-muted-foreground">Workspace Overview</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={openDrawer}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Ask AI</span>
            </button>
            {isAdmin && (
              <button
                onClick={openInviteModal}
                className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite Members
              </button>
            )}
          </div>
        </header>

        {/* Workspace Canvas Body */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl space-y-8 py-6">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xs space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary mb-3">
                    <Sparkles className="h-3 w-3" /> Active Workspace
                  </span>
                  <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{activeWorkspace.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeWorkspace.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Quick Channel Jump */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                {defaultGroup && (
                  <div
                    onClick={() => router.push(`/w/${activeWorkspace.slug}/${defaultGroup.slug}`)}
                    className="group cursor-pointer rounded-xl border border-border bg-muted/30 p-5 transition hover:border-primary/50 hover:bg-muted/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                          <Hash className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">#{defaultGroup.name}</h4>
                          <p className="text-[10px] text-muted-foreground">Default Chat Channel</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </div>
                )}

                <div
                  onClick={openCreateGroupModal}
                  className="group cursor-pointer rounded-xl border border-dashed border-border bg-muted/20 p-5 transition hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">+ Create New Channel</h4>
                      <p className="text-[10px] text-muted-foreground">Add topics for team discussions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <InviteMemberModal />
      <CreateGroupModal />
      <WorkspaceSettingsModal />
    </div>
  );
}
