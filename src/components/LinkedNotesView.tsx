import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XIcon, PaperclipIcon, ArrowRightIcon, EyeIcon } from '@phosphor-icons/react';
import { Note } from '@/lib/types';
import { MarkdownPreview } from '@/components/MarkdownPreview';

interface LinkedNotesViewProps {
  notes: Note[];
  onClose: () => void;
  onNavigateToNote: (noteId: string) => void;
  onPreviewNote?: (noteId: string) => void;
}

export function LinkedNotesView({ notes, onClose, onNavigateToNote, onPreviewNote }: LinkedNotesViewProps) {
  return (
    <div className="h-full flex flex-col border-l border-border bg-card/30">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold">Linked Notes ({notes.length})</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <XIcon size={20} />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No linked notes
            </div>
          ) : (
            notes.map(note => (
              <Card 
                key={note.id} 
                className="p-4 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-base flex-1">{note.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {note.attachments && note.attachments.length > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        <PaperclipIcon size={12} className="mr-0.5" />
                        {note.attachments.length}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-foreground line-clamp-3 mb-3">
                  <MarkdownPreview content={note.content} />
                </div>
                <div className="flex items-center gap-2">
                  {onPreviewNote && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewNote(note.id)}
                      className="flex-1"
                    >
                      <EyeIcon size={16} className="mr-1" />
                      Preview
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onNavigateToNote(note.id)}
                    className="flex-1"
                  >
                    <ArrowRightIcon size={16} className="mr-1" />
                    Open
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
