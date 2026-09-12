'use client';

import React from 'react';
import { Sparkles, Command, MessageSquareText } from 'lucide-react';
import { useAI } from '../context/AIContext';

export default function AIFloatingTrigger() {
  const { openDrawer, isDrawerOpen } = useAI();

  if (isDrawerOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center">
      <div className="relative group rounded-full p-[1.5px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95">
        <button
          onClick={openDrawer}
          title="Open AI Chat Assistant (Cmd+K)"
          className="flex items-center gap-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 border border-white/10"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
            <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
          </div>
          <span className="font-medium tracking-tight">Ask AI</span>
          <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
            <Command className="h-2.5 w-2.5" /> K
          </span>
        </button>
      </div>
    </div>
  );
}
