'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const { setTokenAndFetchUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenAndFetchUser(token);
    }
  }, [searchParams, setTokenAndFetchUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
      <p className="text-lg font-medium text-slate-300">Completing authentication...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p className="text-lg font-medium text-slate-300">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
