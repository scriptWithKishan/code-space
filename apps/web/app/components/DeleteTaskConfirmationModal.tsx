'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface DeleteTaskConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  taskTitle: string;
  onDeleted: () => void;
}

export default function DeleteTaskConfirmationModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onDeleted,
}: DeleteTaskConfirmationModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !taskId) return null;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await api.delete(`/tasks/${taskId}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete task', err);
      setError(err?.response?.data?.message || 'Failed to delete task. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 text-destructive shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Delete Task</h3>
            <p className="text-xs text-muted-foreground">Confirm permanent task deletion</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to delete task <span className="font-bold text-foreground">"{taskTitle}"</span>? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90 transition shadow-xs disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
