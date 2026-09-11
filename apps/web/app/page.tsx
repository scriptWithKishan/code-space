'use client';

import React from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from "./sidebar";
import {
  Sparkles,
  Home as HomeIcon,
  Layers,
  Compass,
  LogOut,
  LogIn,
} from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <HomeIcon className="h-4 w-4 text-primary" />
              <span>/</span>
              <span className="text-foreground font-semibold">Home</span>
            </div>
          </div>

        </header>

        {/* Main Body Placeholder */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl space-y-8 py-12 text-center">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>HOME PAGE PLACEHOLDER</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Welcome to <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">AI Code-Space</span>
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                This is the home page placeholder. The sidebar navigation on the left can be collapsed or expanded, and custom routes will be added soon.
              </p>
            </div>

            {/* Visual Cards Grid Placeholder */}
            <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3 pt-6">
              <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-sm transition hover:border-primary/40 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 border border-primary/20">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-card-foreground">Collapsible Navigation</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Toggle the sidebar icon at top-left to slide open or collapse navigation seamlessly.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-sm transition hover:border-primary/40 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 mb-4 border border-indigo-500/20">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-card-foreground">Route Ready</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  The sidebar container is initialized and ready to receive future page routes and tools.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-sm transition hover:border-primary/40 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 mb-4 border border-purple-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-card-foreground">Prompt-to-Action AI</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Integrated with Google Gemini API to turn natural language prompts into automated platform actions.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
