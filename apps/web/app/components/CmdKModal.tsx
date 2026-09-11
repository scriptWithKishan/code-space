'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Command, ArrowRight, CornerDownLeft, X, Building2, UserPlus, Zap } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useWorkspace } from '../context/WorkspaceContext';

export default function CmdKModal() {
  const { isCmdKOpen, closeCmdK, openDrawer, executePrompt, executing } = useAI();
  const { activeWorkspace } = useWorkspace();
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCmdKOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPrompt('');
    }
  }, [isCmdKOpen]);

  if (!isCmdKOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || executing) return;
    const text = prompt;
    setPrompt('');
    closeCmdK();
    openDrawer();
    await executePrompt(text);
  };

  const handleSuggestionClick = async (text: string) => {
    closeCmdK();
    openDrawer();
    await executePrompt(text);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeCmdK}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-card-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Input Field */}
        <div className="relative flex items-center border-b border-border px-4 py-3 bg-card/90">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mr-3 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                closeCmdK();
              }
            }}
            placeholder="Type an AI command (e.g. 'Create workspace Alpha', 'Invite dev@team.com')..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {prompt && (
            <button
              onClick={() => setPrompt('')}
              className="mr-2 p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            disabled={!prompt.trim() || executing}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40"
          >
            <span>Execute</span>
            <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Quick Action Suggestions */}
        <div className="p-3 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            Suggested Actions
          </p>

          <div className="space-y-1">
            <button
              onClick={() => handleSuggestionClick('Create a workspace named NextGen Apps')}
              className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-accent hover:text-accent-foreground text-xs transition group"
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">Create Workspace "NextGen Apps"</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
            </button>

            {activeWorkspace && (
              <button
                onClick={() => handleSuggestionClick(`Invite developer@company.com to ${activeWorkspace.name}`)}
                className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-accent hover:text-accent-foreground text-xs transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">
                    Invite developer@company.com to <span className="font-bold">{activeWorkspace.name}</span>
                  </span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </button>
            )}

            <button
              onClick={() => handleSuggestionClick('Create workspace Design Studio and invite designer@agency.com')}
              className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-accent hover:text-accent-foreground text-xs transition group"
            >
              <div className="flex items-center space-x-2.5">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-medium text-foreground">
                  Multi-action: Create workspace "Design Studio" & send invite
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>
        </div>

        {/* Footer shortcuts info */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-card text-[11px] text-muted-foreground">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">↵</kbd> to execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">ESC</kbd> to close
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
            <Command className="h-3 w-3" /> + K anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
