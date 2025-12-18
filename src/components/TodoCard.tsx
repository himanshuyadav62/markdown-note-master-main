import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { TrashIcon, LinkIcon, NoteIcon, TagIcon, XIcon, PlusIcon, FoldersIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Todo, TodoGroup } from '@/lib/types';

interface TodoCardProps {
  todo: Todo;
  groups: TodoGroup[];
  onToggle: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onLinkNotes: () => void;
  onViewNotes: () => void;
  onToggleGroup: (groupId: string) => void;
  onUpdateTags: (tags: string[]) => void;
}

export function TodoCard({ todo, groups, onToggle, onDelete, onLinkNotes, onViewNotes, onToggleGroup, onUpdateTags }: TodoCardProps) {
  const [newTag, setNewTag] = useState('');
  const assignedGroups = groups.filter(g => (todo.groupIds || []).includes(g.id));
  const linkedNoteIds = todo.linkedNoteIds || [];
  const tags = todo.tags || [];

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onUpdateTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <Card className="p-2 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={onToggle}
          className="mt-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 
              className={`font-medium text-sm leading-snug ${
                todo.completed ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {todo.title}
            </h3>
            {tags.map(tag => (
              <Badge 
                key={tag}
                variant="secondary"
                className="h-4 px-1.5 text-[10px] leading-none py-0.5 group/tag"
              >
                #{tag}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                >
                  <XIcon size={8} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {linkedNoteIds.length > 0 && (
              <>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] leading-none py-0.5">
                  <NoteIcon size={10} className="mr-0.5" />
                  {linkedNoteIds.length} {linkedNoteIds.length === 1 ? 'note' : 'notes'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewNotes}
                  className="h-4 px-1 text-[10px] text-accent hover:text-accent"
                >
                  View
                </Button>
              </>
            )}
            {assignedGroups.map(group => (
              <Badge 
                key={group.id}
                variant="outline" 
                className="h-4 px-1.5 text-[10px] leading-none py-0.5"
                style={{ 
                  borderColor: group.color,
                  color: group.color
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full mr-0.5" 
                  style={{ backgroundColor: group.color }}
                />
                {group.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-wrap justify-end">
          <div className="flex items-center gap-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-accent"
                  aria-label="Manage tags"
                  title="Manage tags"
                >
                  <TagIcon size={13} weight="fill" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Tags</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={handleAddTag}
                    className="h-8 w-8 shrink-0"
                    aria-label="Add tag"
                  >
                    <PlusIcon size={16} weight="bold" aria-hidden="true" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <Badge 
                        key={tag}
                        variant="secondary"
                        className="h-6 px-2 text-xs"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-destructive"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <XIcon size={10} aria-hidden="true" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No tags yet. Add one above.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-accent"
                aria-label="Assign to groups"
                title="Assign to groups"
              >
                <FoldersIcon size={13} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-2">
                <p className="text-sm font-semibold mb-3">Assign to Groups</p>
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No custom groups. Create one in Manage Groups.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groups.map(group => (
                      <div
                        key={group.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => onToggleGroup(group.id)}
                      >
                        <Checkbox
                          checked={(todo.groupIds || []).includes(group.id)}
                          onCheckedChange={() => onToggleGroup(group.id)}
                        />
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm flex-1">{group.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLinkNotes}
            className="h-6 w-6 text-muted-foreground hover:text-accent"
            aria-label="Link notes"
            title="Link notes"
          >
            <LinkIcon size={13} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            aria-label="Delete todo"
            title="Delete"
          >
            <TrashIcon size={13} aria-hidden="true" />
          </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
