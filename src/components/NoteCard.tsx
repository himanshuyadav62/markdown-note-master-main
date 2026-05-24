import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaperclipIcon } from '@phosphor-icons/react';
import { Note } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  searchQuery?: string;
  isPendingSave?: boolean;
}

export function NoteCard({ note, isActive, onClick, searchQuery, isPendingSave = false }: Readonly<NoteCardProps>) {
  const getPreview = (content: string) => {
    const div = document.createElement('div');
    div.innerHTML = content;
    const plain = div.textContent || div.innerText || '';
    return plain.substring(0, 80) + (plain.length > 80 ? '...' : '');
  };

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={`${part}-${i}`} className="bg-accent/30 text-foreground">{part}</mark> : 
        part
    );
  };

  return (
    <Card
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isActive ? 'ring-2 ring-accent border-accent' : ''
      } ${isPendingSave ? 'animate-pulse border-transparent bg-gradient-to-r from-fuchsia-500/15 via-sky-500/15 to-emerald-500/15 ring-2 ring-fuchsia-400/40 shadow-[0_0_0_1px_rgba(217,70,239,0.3)]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <h3 className="font-semibold text-base truncate flex-1 min-w-0">
              {highlightText(note.title || 'Untitled', searchQuery)}
            </h3>
            {note.attachments && note.attachments.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                <PaperclipIcon size={12} className="mr-0.5" />
                {note.attachments.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2 break-all">
            {highlightText(getPreview(note.content), searchQuery)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}
