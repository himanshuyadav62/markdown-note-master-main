import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, ArrowCounterClockwiseIcon, NotePencilIcon } from '@phosphor-icons/react';
import { NoteCard } from '@/components/NoteCard';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AttachmentManager } from '@/components/AttachmentManager';
import { Note, Attachment } from '@/lib/types';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/AuthProvider';
import { useNotes } from '@/hooks/use-data-sync';

export function NotesApp() {
  const { user } = useAuth();
  const { notes: notesData, setNotes, refetch: refetchNotes } = useNotes();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId?: string }>();
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
  const isResizing = useRef(false);
  const isResizingAttachment = useRef(false);
  const contentDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const titleDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync URL with selected note
  useEffect(() => {
    if (noteId) {
      setSelectedNoteId(noteId);
    }
  }, [noteId]);

  // Refetch data when component mounts
  useEffect(() => {
    refetchNotes();
  }, [refetchNotes]);

  const handleSelectNoteWithNavigation = useCallback((note: Note) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    navigate(`/notes/${note.id}`);
  }, [navigate]);

  const selectedNote = useMemo(
    () => allNotes?.find(note => note.id === selectedNoteId),
    [allNotes, selectedNoteId]
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
    
    // Clear existing timer
    if (contentDebounceTimer.current) {
      clearTimeout(contentDebounceTimer.current);
    }
    
    // Set new timer to update after 3 seconds
    if (selectedNoteId) {
      contentDebounceTimer.current = setTimeout(() => {
        setAllNotes(current => 
          (current || []).map(note => 
            note.id === selectedNoteId 
              ? { ...note, content, updatedAt: Date.now() }
              : note
          )
        );
      }, 3000);
    }
  }, [selectedNoteId, setAllNotes]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setEditTitle(title);
    
    // Clear existing timer
    if (titleDebounceTimer.current) {
      clearTimeout(titleDebounceTimer.current);
    }
    
    // Set new timer to update after 3 seconds
    if (selectedNoteId) {
      titleDebounceTimer.current = setTimeout(() => {
        setAllNotes(current => 
          (current || []).map(note => 
            note.id === selectedNoteId 
              ? { ...note, title, updatedAt: Date.now() }
              : note
          )
        );
      }, 3000);
    }
  }, [selectedNoteId, setAllNotes]);

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

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth >= 0 && newWidth <= 600) {
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

  // Cleanup debounce timers on unmount or when note changes
  useEffect(() => {
    return () => {
      if (contentDebounceTimer.current) {
        clearTimeout(contentDebounceTimer.current);
      }
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
    };
  }, [selectedNoteId]);

  return (
    <div className="flex-1 flex overflow-hidden w-full">
        {isSidebarVisible && (
          <>
            <aside 
              className="border-r border-border bg-card/30 flex flex-col relative overflow-hidden"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="p-4 shrink-0" style={{ minWidth: 0 }}>
                <div className="relative" style={{ minWidth: 0 }}>
                  <MagnifyingGlassIcon 
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" 
                  />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                    style={{ minWidth: 0 }}
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
