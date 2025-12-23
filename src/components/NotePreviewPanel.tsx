import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { XIcon, PaperclipIcon, DownloadSimpleIcon, FileTextIcon, ImageIcon, FilePdfIcon, FileDocIcon } from '@phosphor-icons/react';
import { Note, Attachment } from '@/lib/types';
import { MarkdownPreview } from '@/components/MarkdownPreview';

interface NotePreviewPanelProps {
  note: Note | null;
  onClose: () => void;
  onNavigateToNote: (noteId: string) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) {
    return ImageIcon;
  } else if (type === 'application/pdf') {
    return FilePdfIcon;
  } else if (type.includes('document') || type.includes('word')) {
    return FileDocIcon;
  }
  return FileTextIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function downloadAttachment(attachment: Attachment) {
  const link = document.createElement('a');
  link.href = attachment.data;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function NotePreviewPanel({ note, onClose }: Readonly<NotePreviewPanelProps>) {
  if (!note) {
    return (
      <div className="h-full flex flex-col border-l border-border bg-card/30">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Note Preview</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
               className="h-8 w-8"
               aria-label="Close preview"
               title="Close preview"
          >
               <XIcon size={20} aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Select a note to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-border bg-card/30">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold">Note Preview</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
             className="h-8 w-8"
             aria-label="Close preview"
             title="Close preview"
        >
             <XIcon size={20} aria-hidden="true" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mb-4 pb-4 border-b border-border">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold flex-1">{note.title || 'Untitled'}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
              {note.updatedAt !== note.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
            {note.attachments && note.attachments.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">
                  <PaperclipIcon size={14} className="mr-1" />
                  {note.attachments.length} {note.attachments.length === 1 ? 'attachment' : 'attachments'}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="prose prose-sm max-w-none">
            <MarkdownPreview content={note.content} />
          </div>

          {note.attachments && note.attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Attachments</h3>
              <div className="space-y-2">
                {note.attachments.map(attachment => {
                  const FileIconComponent = getFileIcon(attachment.type);
                  const isImage = attachment.type.startsWith('image/');
                  
                  return (
                    <Card key={attachment.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <FileIconComponent size={24} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="shrink-0"
                        >
                          <DownloadSimpleIcon size={16} className="mr-1" />
                          Download
                        </Button>
                      </div>
                      {isImage && (
                        <div className="mt-3">
                          <img 
                            src={attachment.data} 
                            alt={attachment.name}
                            className="w-full rounded-md border border-border"
                          />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
