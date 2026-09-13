'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAI } from '../context/AIContext';
import { useSidebar } from '../context/SidebarContext';
import {
  Sparkles,
  PanelLeftClose,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react';

export default function PrimarySidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { workspaces, activeWorkspace, openCreateModal, loadingWorkspaces } = useWorkspace();
  const { openDrawer } = useAI();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const visibleWorkspaces = expandedWorkspaces ? workspaces : workspaces.slice(0, 3);
  const overflowCount = workspaces.length - 3;

  return (
    <aside
      className={`relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-64' : 'w-16'
      } overflow-hidden shrink-0 z-20`}
    >
      {/* Sidebar Header */}
      <div
        className={`flex h-16 items-center border-b border-sidebar-border px-3 ${
          isSidebarOpen ? 'justify-between' : 'justify-center'
        }`}
      >
        {isSidebarOpen ? (
          <>
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none truncate">
                  AI Code-Space
                </h1>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Workspace Platform
                </p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              title="Close Sidebar"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition shrink-0"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Open Sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition shrink-0"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Workspace Section List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {user && (
          <div>
            {isSidebarOpen && (
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspaces
                </span>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-md">
                  {workspaces.length}
                </span>
              </div>
            )}

            {/* Workspaces List */}
            <div className="space-y-0.5">
              {loadingWorkspaces ? (
                <div className="space-y-1 py-1">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-7 rounded-lg bg-muted/40 animate-pulse flex items-center px-2"
                    />
                  ))}
                </div>
              ) : workspaces.length === 0 ? (
                isSidebarOpen && (
                  <div className="rounded-xl border border-dashed border-sidebar-border p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">No workspaces yet.</p>
                  </div>
                )
              ) : (
                visibleWorkspaces.map((ws) => {
                  const isActive = pathname === `/w/${ws.slug}` || pathname.startsWith(`/w/${ws.slug}/`);
                  const firstChar = ws.name.charAt(0).toUpperCase();

                  return (
                    <button
                      key={ws._id}
                      onClick={() => router.push(`/w/${ws.slug}`)}
                      title={ws.name}
                      className={`flex w-full items-center rounded-lg px-2 py-1.5 transition text-left ${
                        isSidebarOpen ? 'justify-start space-x-2.5' : 'justify-center'
                      } ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-2xs border border-sidebar-accent/50'
                          : 'text-sidebar-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div
                        className={`flex h-6.5 w-6.5 items-center justify-center rounded-md text-[11px] font-bold shrink-0 transition ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted/80 text-foreground border border-sidebar-border'
                        }`}
                      >
                        {firstChar}
                      </div>
                      {isSidebarOpen && (
                        <div className="truncate min-w-0 flex-1">
                          <p className="text-xs font-medium truncate leading-none">{ws.name}</p>
                        </div>
                      )}
                    </button>
                  );
                })
              )}

              {/* Overflow Toggle (+ N More / Show Less) */}
              {workspaces.length > 3 && (
                <button
                  onClick={() => setExpandedWorkspaces((prev) => !prev)}
                  className={`flex w-full items-center justify-center rounded-xl py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition ${
                    isSidebarOpen ? 'px-2.5 space-x-1.5' : 'px-1'
                  }`}
                  title={expandedWorkspaces ? 'Show Less' : `Show ${overflowCount} more workspaces`}
                >
                  {isSidebarOpen ? (
                    <>
                      <span>{expandedWorkspaces ? 'Show Less' : `+ ${overflowCount} More`}</span>
                      {expandedWorkspaces ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-bold">
                      {expandedWorkspaces ? 'Less' : `+${overflowCount}`}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Create Workspace Button */}
            <button
              onClick={openCreateModal}
              title="Create Workspace"
              className={`flex w-full items-center justify-center rounded-lg border border-dashed border-sidebar-border bg-sidebar hover:bg-muted/60 text-sidebar-foreground py-1.5 mt-1.5 transition ${
                isSidebarOpen ? 'px-2.5 space-x-2' : 'px-1.5'
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
              {isSidebarOpen && <span className="text-xs font-medium">Create Workspace</span>}
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2.5">
        {/* Native Ask AI Button */}
        <button
          onClick={openDrawer}
          title="Open AI Chat Assistant (Cmd+K)"
          className={`flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-primary/15 via-purple-500/15 to-primary/15 border border-primary/30 hover:border-primary/50 text-foreground transition shadow-2xs ${
            isSidebarOpen ? 'px-3 py-2' : 'justify-center p-2'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
            {isSidebarOpen && <span className="text-xs font-semibold">Ask AI</span>}
          </div>
          {isSidebarOpen && (
            <span className="text-xs font-mono text-muted-foreground bg-background/80 px-2 py-1 rounded-lg border border-border">
              ⌘ K
            </span>
          )}
        </button>
        {isSidebarOpen ? (
          <div className="space-y-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-sidebar-foreground hover:bg-muted border border-sidebar-border/60 transition"
            >
              <div className="flex items-center space-x-2.5">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <div
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                  theme === 'dark' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* User Info / Sign In */}
            {user ? (
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2.5 border border-sidebar-border">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover shrink-0 border border-sidebar-border"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 border border-primary/30">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-muted/50 text-sidebar-foreground transition hover:bg-muted shrink-0 shadow-xs"
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            {user ? (
              <>
                <div
                  title={`${user.name} (${user.email})`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 border border-sidebar-border shadow-xs shrink-0"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                title="Sign In"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
              >
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
