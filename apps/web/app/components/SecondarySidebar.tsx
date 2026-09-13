'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '../context/WorkspaceContext';
import { useConversation } from '../context/ConversationContext';
import { useAuth } from '../context/AuthContext';
import { isWorkspaceAdmin } from '../lib/utils';
import {
  Hash,
  Plus,
  UserPlus,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Building2,
} from 'lucide-react';

export default function SecondarySidebar() {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const {
    groups,
    activeGroup,
    loadingGroups,
    openCreateGroupModal,
    openInviteModal,
    openSettingsModal,
  } = useConversation();
  const router = useRouter();
  const pathname = usePathname();

  const [expandedChannels, setExpandedChannels] = useState(false);

  if (!activeWorkspace) return null;

  const isAdmin = isWorkspaceAdmin(user, activeWorkspace);

  const visibleChannels = expandedChannels ? groups : groups.slice(0, 3);
  const channelOverflowCount = groups.length - 3;

  return (
    <aside className="relative flex flex-col w-60 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0 z-10">
      {/* Header: Active Workspace Details & Quick Actions */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3.5">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs shrink-0 border border-primary/30">
            {activeWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <h2 className="text-xs font-bold text-sidebar-foreground tracking-tight truncate leading-tight">
              {activeWorkspace.name}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {activeWorkspace.members.length} {activeWorkspace.members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        <button
          onClick={openSettingsModal}
          title="Workspace Settings"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition shrink-0"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Body: Conversation Groups / Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Channels ({groups.length})
            </span>
            <button
              onClick={openCreateGroupModal}
              title="Create Channel Group"
              className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {loadingGroups ? (
              <div className="space-y-1 py-1">
                {[1, 2].map((i) => (
                  <div key={i} className="h-7 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sidebar-border p-2.5 text-center">
                <p className="text-[11px] text-muted-foreground">No channels created.</p>
              </div>
            ) : (
              <>
                {visibleChannels.map((group) => {
                  const isActive =
                    activeGroup?.slug === group.slug ||
                    pathname === `/w/${activeWorkspace.slug}/${group.slug}`;

                  return (
                    <button
                      key={group._id}
                      onClick={() => router.push(`/w/${activeWorkspace.slug}/${group.slug}`)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition text-left ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                          : 'text-sidebar-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Hash className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="truncate leading-tight">{group.name}</span>
                      </div>
                      {group.isDefault && (
                        <span className="text-[9px] text-muted-foreground uppercase font-mono bg-muted/60 px-1 py-0.5 rounded">
                          def
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Channel Overflow Toggle (+ N More / Show Less) */}
                {groups.length > 3 && (
                  <button
                    onClick={() => setExpandedChannels((prev) => !prev)}
                    className="flex w-full items-center justify-center space-x-1.5 rounded-xl py-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition mt-1"
                    title={expandedChannels ? 'Show Less' : `Show ${channelOverflowCount} more channels`}
                  >
                    <span>{expandedChannels ? 'Show Less' : `+ ${channelOverflowCount} More`}</span>
                    {expandedChannels ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions: Invite & Settings */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {isAdmin && (
          <button
            onClick={openInviteModal}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
          >
            <div className="flex items-center space-x-2.5">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>Invite Team Member</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        <button
          onClick={openSettingsModal}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
        >
          <div className="flex items-center space-x-2.5">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Workspace Settings</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
