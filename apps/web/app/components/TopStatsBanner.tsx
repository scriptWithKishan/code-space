'use client';

import React from 'react';
import { CheckCircle2, ListTodo, AlertTriangle, Users } from 'lucide-react';
import { ProjectStats } from '../context/ProjectContext';

function TopStatsBanner({ stats, loading }: { stats: ProjectStats | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-xs animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-xs transition-all">
      {/* 1. Total Tasks */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shrink-0">
          <ListTodo className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</p>
          <p className="text-base font-extrabold text-foreground tracking-tight">{stats.totalTasks}</p>
        </div>
      </div>

      {/* 2. Completion Percentage */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 shrink-0">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completion</p>
            <span className="text-[11px] font-mono font-bold text-emerald-500">{stats.completionPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. High & Urgent Priority */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20 shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">High/Urgent</p>
          <p className="text-base font-extrabold text-amber-500 tracking-tight">{stats.highUrgentTasksCount}</p>
        </div>
      </div>

      {/* 4. Team Members Count */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/20 shrink-0">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Team Size</p>
          <p className="text-base font-extrabold text-foreground tracking-tight">{stats.teamCount}</p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TopStatsBanner);
