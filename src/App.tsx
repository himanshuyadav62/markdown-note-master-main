import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, ArrowCounterClockwiseIcon, NotePencilIcon, ListIcon, CheckCircleIcon, MoonIcon, SunIcon, ShareNetwork, GoogleLogo, SignOut } from '@phosphor-icons/react';
import { NoteCard } from '@/components/NoteCard';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AttachmentManager } from '@/components/AttachmentManager';
import { TodoApp } from '@/components/TodoApp';
import { Note, Attachment } from '@/lib/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/use-theme';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/providers/AuthProvider';
import { useNotes, useTodos } from '@/hooks/use-data-sync';

function App() {
  const { user, loading: authLoading, actionLoading, isSkipped, signInWithGoogle, signOut, skipLogin } = useAuth();
  const { notes: notesData, setNotes } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { noteId } = useParams<{ noteId?: string }>();
  const [activeTab, setActiveTab] = useState<'notes' | 'todos'>('notes');
  const [notes, setNotesLocal] = useLocalStorage<Note[]>('notes', []);
  // Use synced data if logged in, otherwise use local storage
  const allNotes = user ? notesData : notes;
  const setAllNotes = user ? setNotes : setNotesLocal;
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [attachmentHeight, setAttachmentHeight] = useState(240);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const isResizing = useRef(false);
  const isResizingAttachment = useRef(false);

  // Sync URL with selected note
  useEffect(() => {
    if (noteId) {
      setSelectedNoteId(noteId);
      setActiveTab('notes');
    }
  }, [noteId]);

  // Sync tab based on current location
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/todos')) {
      setActiveTab('todos');
    } else {
      setActiveTab('notes');
    }
  }, [location.pathname]);

  // Navigate when selecting a note
  const handleSelectNoteWithNavigation = useCallback((note: Note) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    navigate(`/notes/${note.id}`);
  }, [navigate]);

  const navigateToNote = useCallback((noteId: string) => {
    setActiveTab('notes');
    const note = allNotes?.find(n => n.id === noteId);
    if (note) {
      handleSelectNoteWithNavigation(note);
      toast.success(`Opened note: ${note.title}`);
    }
  }, [allNotes, handleSelectNoteWithNavigation]);

  const selectedNote = useMemo(
    () => notes?.find(note => note.id === selectedNoteId),
    [notes, selectedNoteId]
  );

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
  }, [selectedNote]);

  const activeNotes = useMemo(() => {
    if (!allNotes) return [];
    return allNotes.filter(note => !note.deletedAt);
  }, [allNotes]);

  const deletedNotes = useMemo(() => {
    if (!allNotes) return [];
    return allNotes.filter(note => note.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    if (!activeNotes) return [];
    if (!searchQuery.trim()) return activeNotes;
    const query = searchQuery.toLowerCase();
    return activeNotes.filter(note => 
      note.title.toLowerCase().includes(query) || 
      note.content.toLowerCase().includes(query)
    );
  }, [activeNotes, searchQuery]);

  const sortedNotes = useMemo(() => {
    return [...(filteredNotes || [])].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filteredNotes]);

  const createNewNote = useCallback(() => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setAllNotes(current => [newNote, ...(current || [])]);
    setSelectedNoteId(newNote.id);
    setEditTitle(newNote.title);
    setEditContent('');
    navigate(`/notes/${newNote.id}`);
    toast.success('New note created');
  }, [setAllNotes, navigate]);

  const updateNote = useCallback((updates: Partial<Note>) => {
    if (!selectedNoteId) return;
    
    setAllNotes(current => 
      (current || []).map(note => 
        note.id === selectedNoteId 
          ? { ...note, ...updates, updatedAt: Date.now() }
          : note
      )
    );
  }, [selectedNoteId, setAllNotes]);

  const addAttachments = useCallback((newAttachments: Attachment[]) => {
    if (!selectedNoteId) return;
    
    setAllNotes(current => 
      (current || []).map(note => 
        note.id === selectedNoteId 
          ? { 
              ...note, 
              attachments: [...(note.attachments || []), ...newAttachments],
              updatedAt: Date.now() 
            }
          : note
      )
    );
  }, [selectedNoteId, setAllNotes]);

  const removeAttachment = useCallback((attachmentId: string) => {
    if (!selectedNoteId) return;
    
    setAllNotes(current => 
      (current || []).map(note => 
        note.id === selectedNoteId 
          ? { 
              ...note, 
              attachments: (note.attachments || []).filter(a => a.id !== attachmentId),
              updatedAt: Date.now() 
            }
          : note
      )
    );
    toast.success('Attachment removed');
  }, [selectedNoteId, setAllNotes]);

  const deleteNote = useCallback((id: string) => {
    setAllNotes(current => 
      (current || []).map(note => 
        note.id === id ? { ...note, deletedAt: Date.now() } : note
      )
    );
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
      setEditTitle('');
      setEditContent('');
      navigate('/notes');
    }
    toast.success('Note moved to recycle bin', {
      action: {
        label: 'Undo',
        onClick: () => restoreNote(id)
      }
    });
  }, [selectedNoteId, setAllNotes, navigate]);

  const restoreNote = useCallback((id: string) => {
    setAllNotes(current => 
      (current || []).map(note => 
        note.id === id ? { ...note, deletedAt: undefined } : note
      )
    );
    toast.success('Note restored');
  }, [setAllNotes]);

  const permanentlyDeleteNote = useCallback((id: string) => {
    setAllNotes(current => (current || []).filter(note => note.id !== id));
    setPermanentDeleteId(null);
    toast.success('Note permanently deleted');
  }, [setAllNotes]);

  const emptyRecycleBin = useCallback(() => {
    setAllNotes(current => (current || []).filter(note => !note.deletedAt));
    toast.success('Recycle bin emptied');
  }, [setAllNotes]);

  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    if (selectedNoteId) {
      updateNote({ content });
    }
  }, [selectedNoteId, updateNote]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setEditTitle(title);
    if (selectedNoteId) {
      updateNote({ title });
    }
  }, [selectedNoteId, updateNote]);

  const handleSelectNote = (note: Note) => {
    handleSelectNoteWithNavigation(note);
  };

  const startResizing = useCallback(() => {
    isResizing.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    isResizingAttachment.current = false;
  }, []);

  const startResizingAttachment = useCallback(() => {
    isResizingAttachment.current = true;
  }, []);

  const handleTabChange = (tab: 'notes' | 'todos') => {
    setActiveTab(tab);
    if (tab === 'todos') {
      navigate(`/todos${location.search}`);
    } else {
      // Navigate to the selected note if one is currently open, otherwise just /notes
      if (selectedNoteId) {
        navigate(`/notes/${selectedNoteId}`);
      } else {
        navigate('/notes');
      }
    }
  };

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizingAttachment.current) {
      const container = document.querySelector('.h-screen');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        if (newHeight >= 20 && newHeight <= 500) {
          setAttachmentHeight(newHeight);
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

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
            <GoogleLogo size={18} className="mr-2" />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarVisible(prev => !prev)}
              title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            >
              <ListIcon size={24} />
            </Button>
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'notes' | 'todos')}>
              <TabsList>
                <TabsTrigger value="notes">
                  <NotePencilIcon size={18} className="mr-1" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="todos">
                  <CheckCircleIcon size={18} className="mr-1" />
                  Todos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/workflows')}
              className="hidden sm:inline-flex"
            >
              <ShareNetwork size={18} className="mr-1" />
              Workflows
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            </Button>
            {user?.email && (
              <div className="hidden sm:block text-sm text-muted-foreground px-2">
                {user.email}
              </div>
            )}
            {user ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                disabled={actionLoading}
              >
                <SignOut size={18} className="mr-1" />
                Sign out
              </Button>
            ) : isSkipped ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={signInWithGoogle}
                disabled={actionLoading}
              >
                <GoogleLogo size={18} className="mr-1" />
                Sign in
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isSidebarVisible && activeTab === 'notes' && (
          <>
            <aside 
              className="border-r border-border bg-card/30 flex flex-col relative"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="p-4">
                <div className="relative">
                  <MagnifyingGlassIcon 
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
                  />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 h-0">
                <div className="px-4 pb-4 space-y-2">
                  {sortedNotes.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-muted-foreground text-sm">
                        {searchQuery ? 'No notes found' : 'No notes yet'}
                      </p>
                      {!searchQuery && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={createNewNote}
                          className="mt-2"
                        >
                          Create your first note
                        </Button>
                      )}
                    </div>
                  ) : (
                    sortedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isActive={note.id === selectedNoteId}
                        onClick={() => handleSelectNote(note)}
                        onDelete={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        searchQuery={searchQuery}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </aside>

            <div
              className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors"
              onMouseDown={startResizing}
            />
          </>
        )}

        {activeTab === 'notes' ? (
          <main className="flex-1 flex flex-col bg-background overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-card/30 shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Notes</h1>
                <div className="flex items-center gap-2">
                  <Sheet open={isRecycleBinOpen} onOpenChange={setIsRecycleBinOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="relative">
                        <TrashIcon size={18} className="mr-1" />
                        Recycle Bin
                        {deletedNotes.length > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                            {deletedNotes.length}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md">
                      <SheetHeader>
                        <SheetTitle>Recycle Bin</SheetTitle>
                        <SheetDescription>
                          Deleted notes are kept here. You can restore or permanently delete them.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        {deletedNotes.length > 0 && (
                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={emptyRecycleBin}
                            >
                              Empty Recycle Bin
                            </Button>
                          </div>
                        )}
                        <ScrollArea className="h-[calc(100vh-240px)]">
                          <div className="space-y-3 pr-4">
                            {deletedNotes.length === 0 ? (
                              <div className="text-center py-12">
                                <TrashIcon size={48} className="mx-auto mb-3 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No deleted notes</p>
                              </div>
                            ) : (
                              deletedNotes.map(note => (
                                <div
                                  key={note.id}
                                  className="p-4 rounded-lg border border-border bg-card"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-base mb-1 truncate">
                                        {note.title || 'Untitled'}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        Deleted {note.deletedAt && new Date(note.deletedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreNote(note.id)}
                                      className="flex-1"
                                    >
                                      <ArrowCounterClockwiseIcon size={16} className="mr-1" />
                                      Restore
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setPermanentDeleteId(note.id)}
                                      className="flex-1"
                                    >
                                      <TrashIcon size={16} className="mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Button onClick={createNewNote} size="sm" className="bg-accent hover:bg-accent/90">
                    <PlusIcon size={18} weight="bold" className="mr-1" />
                    New Note
                  </Button>
                </div>
              </div>
            </div>
            
            {selectedNoteId ? (
              <>
                <div className="border-b border-border p-4 bg-card/30 shrink-0">
                  <Input
                    value={editTitle}
                    onChange={handleTitleChange}
                    placeholder="Note title..."
                    className="text-xl font-semibold border-0 bg-transparent px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="flex-1 h-0 flex flex-col border-x border-border">
                  <RichTextEditor
                    content={editContent}
                    onChange={handleContentChange}
                    placeholder="Start writing your note..."
                  />
                </div>

                <div 
                  className="shrink-0 flex flex-col"
                  style={{ height: `${attachmentHeight}px` }}
                >
                  <div
                    className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors"
                    onMouseDown={startResizingAttachment}
                  />
                  <AttachmentManager
                    attachments={selectedNote?.attachments || []}
                    onAdd={addAttachments}
                    onRemove={removeAttachment}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <NotePencilIcon size={64} className="mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold mb-2 text-foreground">No note selected</h2>
                  <p className="text-muted-foreground mb-4">Select a note or create a new one</p>
                  <Button onClick={createNewNote} className="bg-accent hover:bg-accent/90">
                    <PlusIcon size={18} weight="bold" className="mr-1" />
                    Create Note
                  </Button>
                </div>
              </div>
            )}
          </main>
        ) : (
          <TodoApp 
            onNavigateToNote={navigateToNote} 
            notes={allNotes || []} 
            initialGroup={searchParams.get('todoGroup') || undefined}
          />
        )}
      </div>

      <AlertDialog open={permanentDeleteId !== null} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the note from the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentDeleteId && permanentlyDeleteNote(permanentDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;