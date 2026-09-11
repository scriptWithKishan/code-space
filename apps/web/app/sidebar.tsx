'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import {
  Sparkles,
  PanelLeftClose,
  LogOut,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl transition-all duration-300 ease-in-out ${
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

      {/* Sidebar Body - Empty */}
      <div className="flex-1 overflow-y-auto p-3" />

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {isSidebarOpen ? (
          <div className="space-y-2.5">
            {/* Theme Toggle Switch Row */}
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

              {/* Toggle Switch Pill */}
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
            {/* Theme Toggle Icon Card */}
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
                {/* User Avatar Card */}
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

                {/* Logout Icon Card */}
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