import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotePencilIcon, CheckCircleIcon, MoonIcon, SunIcon, GoogleLogoIcon, ShareNetworkIcon, SignOutIcon } from '@phosphor-icons/react';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';
import { NotesApp } from '@/components/NotesApp';
import { TodoApp } from '@/components/TodoApp';
import { WorkflowsHome } from '@/components/WorkflowsHome';
import { toast } from 'sonner';

type ActiveTab = 'notes' | 'todos' | 'workflows';

function AppLayout() {
  const { user, loading: authLoading, actionLoading, isSkipped, signInWithGoogle, signOut, skipLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const { theme, toggleTheme } = useTheme();

  // Sync tab based on current location
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/todos')) {
      setActiveTab('todos');
    } else if (path.startsWith('/workflows')) {
      setActiveTab('workflows');
    } else if (path.startsWith('/notes')) {
      setActiveTab('notes');
    }
  }, [location.pathname]);

  const navigateToNote = useCallback((noteId: string) => {
    setActiveTab('notes');
    navigate(`/notes/${noteId}`);
    toast.success(`Opened note`);
  }, [navigate]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'todos') {
      navigate('/todos');
    } else if (tab === 'workflows') {
      navigate('/workflows');
    } else {
      navigate('/notes');
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Checking your session...</div>
      </div>
    );
  }

  if (!user && !isSkipped) {
    return (
      <div className="h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in with Google to sync your notes and todos across devices, or continue without signing in.
            </p>
          </div>
          <Button
            onClick={signInWithGoogle}
            disabled={actionLoading}
            className="w-full bg-accent hover:bg-accent/90"
          >
            <GoogleLogoIcon size={18} className="mr-2" />
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card/60 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            onClick={skipLogin}
            disabled={actionLoading}
            variant="outline"
            className="w-full"
          >
            Continue with Local Storage
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Signing in lets you sync your data. Skipping uses local storage only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'notes' | 'todos' | 'workflows')}>
              <TabsList>
                <TabsTrigger value="notes">
                  <NotePencilIcon size={18} className="mr-1" aria-hidden="true" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="todos">
                  <CheckCircleIcon size={18} className="mr-1" aria-hidden="true" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="workflows">
                  <ShareNetworkIcon size={18} className="mr-1" aria-hidden="true" />
                  Workflows
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon size={20} aria-hidden="true" /> : <SunIcon size={20} aria-hidden="true" />}
            </Button>
            {user?.email && (
              <div className="hidden sm:block text-sm text-muted-foreground px-2">
                {user.email}
              </div>
            )}
            {user && (
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                disabled={actionLoading}
              >
                <SignOutIcon size={18} className="mr-1" />
                Sign out
              </Button>
            )}
            {!user && isSkipped && (
              <Button
                variant="secondary"
                size="sm"
                onClick={signInWithGoogle}
                disabled={actionLoading}
              >
                <GoogleLogoIcon size={18} className="mr-1" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'notes' && <NotesApp />}
        {activeTab === 'todos' && <TodoApp onNavigateToNote={navigateToNote} />}
        {activeTab === 'workflows' && <WorkflowsHome />}
      </div>
    </div>
  );
}

export default AppLayout;
