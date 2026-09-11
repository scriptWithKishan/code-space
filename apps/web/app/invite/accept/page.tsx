'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { Building2, UserCheck, Loader2, AlertCircle, Sparkles } from 'lucide-react';

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshWorkspaces } = useWorkspace();

  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token in URL.');
      setLoading(false);
      return;
    }

    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/workspaces/invites/${token}`);
        setInviteDetails(response.data);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || 'Invalid or expired invitation token.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    if (!user) {
      // Redirect to register with token preserved
      router.push(`/register?inviteToken=${token}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);
      const response = await api.post<{ success: boolean; workspaceSlug: string }>('/workspaces/invites/accept', {
        token,
      });

      // Live update: refetch user workspaces so new workspace is immediately in client state
      await refreshWorkspaces();

      router.push(`/w/${response.data.workspaceSlug}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground text-xs space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Validating invitation link...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-md">
          <Sparkles className="h-7 w-7" />
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-base font-bold">Invitation Error</h2>
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                You've been invited!
              </h2>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{inviteDetails?.invitedBy?.name || 'A team member'}</span> has invited you to collaborate in{' '}
                <span className="font-semibold text-foreground">{inviteDetails?.workspaceId?.name || 'Workspace'}</span>.
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-4 border border-border text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{inviteDetails?.workspaceId?.name}</span>
                <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                  {inviteDetails?.role || 'MEMBER'}
                </span>
              </div>
              {inviteDetails?.workspaceId?.description && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {inviteDetails.workspaceId.description}
                </p>
              )}
            </div>

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-md disabled:opacity-50"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining Workspace...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  {user ? 'Accept Invitation' : 'Sign Up to Join'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <InviteAcceptContent />
    </Suspense>
  );
}
