'use client';

import React from 'react';
import { Sparkles, Command } from 'lucide-react';
import { useAI } from '../context/AIContext';

export default function AIFloatingTrigger() {
  const { openCmdK, toggleDrawer, isDrawerOpen } = useAI();

  if (isDrawerOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        onClick={openCmdK}
        className="group relative flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 hover:bg-primary/90 active:scale-95"
      >
        <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
        <span>Ask AI</span>
        <span className="hidden sm:inline-flex items-center gap-0.5 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-mono text-primary-foreground">
          <Command className="h-2.5 w-2.5" /> K
        </span>
      </button>
    </div>
  );
}
