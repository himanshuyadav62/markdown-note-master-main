import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from './providers/AuthProvider';

export function AuthCallback() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      navigate('/notes', { replace: true });
    }
  }, [loading, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-background px-6">
      <div className="rounded-lg border border-border bg-card/60 px-6 py-4 shadow-sm text-sm text-muted-foreground">
        Finishing sign-in...
      </div>
    </div>
  );
}
