'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, CheckCircle2, Trash2, Bot, User, Command } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useWorkspace } from '../context/WorkspaceContext';

export default function AIChatDrawer() {
  const { isDrawerOpen, closeDrawer, messages, executing, executePrompt, clearHistory } = useAI();
  const { activeWorkspace } = useWorkspace();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isDrawerOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || executing) return;
    const text = input;
    setInput('');
    await executePrompt(text);
  };

  const handleSuggestion = (suggestion: string) => {
    executePrompt(suggestion);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-border bg-card text-card-foreground shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-5 bg-card/80 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">AI Prompt Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Powered by Google Gemini</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearHistory}
                title="Clear Chat History"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={closeDrawer}
                title="Close AI Assistant"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Suggested AI Prompts
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSuggestion('Create a workspace named Mobile Launch')}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition shadow-2xs"
              >
                + Create Workspace
              </button>
              {activeWorkspace && (
                <button
                  onClick={() => handleSuggestion(`Invite alex@company.com to ${activeWorkspace.name}`)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition shadow-2xs"
                >
                  + Send Invite Email
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex space-x-3 text-left ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-foreground border border-border'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                </div>

                <div className={`max-w-[85%] space-y-1.5 ${msg.sender === 'user' ? 'items-end text-right' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-xs'
                        : 'bg-muted/50 border border-border text-foreground rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Render Action Badges */}
                  {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {msg.actionsExecuted.map((action, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>{action.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Footer */}
          <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask AI to create workspace or invite team..."
                rows={1}
                className="w-full rounded-xl border border-input bg-background pl-4 pr-12 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none max-h-24"
              />
              <button
                type="submit"
                disabled={!input.trim() || executing}
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40"
                title="Send Prompt"
              >
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
