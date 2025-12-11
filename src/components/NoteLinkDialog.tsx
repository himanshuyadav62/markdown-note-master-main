import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Note } from '@/lib/types';

interface NoteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  selectedNoteIds: string[];
  onSave: (noteIds: string[]) => void;
}

export function NoteLinkDialog({ open, onOpenChange, notes, selectedNoteIds, onSave }: NoteLinkDialogProps) {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      setTempSelectedIds(selectedNoteIds);
      setSearchQuery('');
    }
  }, [open, selectedNoteIds]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleToggleNote = (noteId: string) => {
    setTempSelectedIds(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleSave = () => {
    onSave(tempSelectedIds);
    onOpenChange(false);
  };

  const filteredNotes = notes.filter(note => 
    !note.deletedAt && (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Notes</DialogTitle>
          <DialogDescription>
            Select notes to link with this todo. You can select multiple notes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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

          <ScrollArea className="h-[300px] rounded-md border p-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No notes found' : 'No notes available'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map(note => (
                  <div 
                    key={note.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/10 cursor-pointer"
                    onClick={() => handleToggleNote(note.id)}
                  >
                    <Checkbox
                      checked={tempSelectedIds.includes(note.id)}
                      onCheckedChange={() => handleToggleNote(note.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{note.title || 'Untitled'}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save ({tempSelectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
