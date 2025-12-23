import type React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusIcon, TrashIcon, ArrowCounterClockwiseIcon, CheckCircleIcon, XIcon, TagIcon, FoldersIcon, PencilSimpleIcon, CheckIcon } from '@phosphor-icons/react';
import { TodoCard } from '@/components/TodoCard';
import { NoteLinkDialog } from '@/components/NoteLinkDialog';
import { LinkedNotesView } from '@/components/LinkedNotesView';
import { NotePreviewPanel } from '@/components/NotePreviewPanel';
import { Todo, TodoGroup } from '@/lib/types';
import { useTodoGroups, useNotes, useTodos } from '@/hooks/use-data-sync';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface TodoAppProps {
    onNavigateToNote: (noteId: string) => void;
}

export function TodoApp({ onNavigateToNote }: Readonly<TodoAppProps>) {
    const { user } = useAuth();
    const { notes: notesData } = useNotes();
    const { todos: todosData, setTodos } = useTodos();
    const [searchParams, setSearchParams] = useSearchParams();
    const { groups, setGroups } = useTodoGroups();
    const [newTodoTitle, setNewTodoTitle] = useState('');
    const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
    const [viewingNotesForTodo, setViewingNotesForTodo] = useState<string | null>(null);
    const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);
    const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#65c4a0');
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [activeTabValue, setActiveTabValue] = useState('all');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupColor, setEditGroupColor] = useState('');
    const [linkedNotesWidth, setLinkedNotesWidth] = useState(384);
    const [previewPanelWidth, setPreviewPanelWidth] = useState(400);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isResizingLinkedNotes = useRef(false);
    const isResizingPreview = useRef(false);
    const isSettingFromUrl = useRef(false);

    const notes = notesData || [];
    const todos = todosData || [];
    const initialGroup = searchParams.get('todoGroup') || undefined;

    useEffect(() => {
        if (todos && todos.length > 0) {
            const needsMigration = todos.some((todo: any) => !todo.groupIds || !todo.linkedNoteIds);
            if (needsMigration) {
                setTodos(current =>
                    (current || []).map(todo => ({
                        ...todo,
                        groupIds: (todo as any).groupIds || [],
                        linkedNoteIds: (todo as any).linkedNoteIds || []
                    }))
                );
            }
        }
    }, []);

    const activeTodos = useMemo(() => {
        if (!todos) return [];
        return todos.filter(todo => !todo.deletedAt);
    }, [todos]);

    // Filter todos by selected tag
    const filterTodosByTag = useCallback((todoList: Todo[]) => {
        if (!selectedTagFilter) return todoList;
        return todoList.filter(todo => 
            todo.tags?.includes(selectedTagFilter)
        );
    }, [selectedTagFilter]);

    const deletedTodos = useMemo(() => {
        if (!todos) return [];
        return todos.filter(todo => todo.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    }, [todos]);

    const groupTodosByDate = useCallback((todoList: Todo[]) => {
        const groups = new Map<string, Todo[]>();

        todoList.forEach(todo => {
            const date = new Date(todo.createdAt);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey: string;

            if (date.toDateString() === today.toDateString()) {
                dateKey = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateKey = 'Yesterday';
            } else {
                dateKey = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(todo);
        });

        return Array.from(groups.entries())
            .map(([date, list]) => {
                const sortedTodos = [...list].sort((a, b) => b.createdAt - a.createdAt);
                return {
                    date,
                    todos: sortedTodos,
                    timestamp: sortedTodos[0].createdAt
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, []);

    const incompleteTodos = useMemo(() => {
        const filtered = activeTodos.filter(todo => !todo.completed).sort((a, b) => b.createdAt - a.createdAt);
        return filterTodosByTag(filtered);
    }, [activeTodos, filterTodosByTag]);

    const completedTodos = useMemo(() => {
        const filtered = activeTodos.filter(todo => todo.completed).sort((a, b) => b.updatedAt - a.updatedAt);
        return filterTodosByTag(filtered);
    }, [activeTodos, filterTodosByTag]);

    const allTodos = useMemo(() => {
        const filtered = [...activeTodos].sort((a, b) => b.createdAt - a.createdAt);
        return filterTodosByTag(filtered);
    }, [activeTodos, filterTodosByTag]);

    const groupedAllTodos = useMemo(() => groupTodosByDate(allTodos), [allTodos, groupTodosByDate]);
    const groupedIncompleteTodos = useMemo(() => groupTodosByDate(incompleteTodos), [incompleteTodos, groupTodosByDate]);
    const groupedCompleteTodos = useMemo(() => groupTodosByDate(completedTodos), [completedTodos, groupTodosByDate]);

    const activeNotes = useMemo(() => {
        if (!notes) return [];
        return notes.filter(note => !note.deletedAt);
    }, [notes]);

    const linkedNotesForViewing = useMemo(() => {
        if (!viewingNotesForTodo || !notes) return [];
        const todo = todos?.find(t => t.id === viewingNotesForTodo);
        if (!todo?.linkedNoteIds) return [];
        return notes.filter(note =>
            todo.linkedNoteIds.includes(note.id) && !note.deletedAt
        );
    }, [viewingNotesForTodo, todos, notes]);

    const previewNote = useMemo(() => {
        if (!previewNoteId || !notes) return null;
        return notes.find(note => note.id === previewNoteId && !note.deletedAt) || null;
    }, [previewNoteId, notes]);

    const createTodo = useCallback(() => {
        if (!newTodoTitle.trim()) {
            toast.error('Please enter a todo title');
            return;
        }

        const newTodo: Todo = {
            id: uuidv4(),
            title: newTodoTitle.trim(),
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            linkedNoteIds: [],
            groupIds: []
        };

        setTodos(current => [newTodo, ...(current || [])]);
        setNewTodoTitle('');
        toast.success('Todo created');
    }, [newTodoTitle, setTodos]);

    const toggleTodo = useCallback((id: string) => {
        setTodos(current =>
            (current || []).map(todo =>
                todo.id === id
                    ? { ...todo, completed: !todo.completed, updatedAt: Date.now() }
                    : todo
            )
        );
    }, [setTodos]);

    const deleteTodo = useCallback((id: string) => {
        setTodos(current =>
            (current || []).map(todo =>
                todo.id === id ? { ...todo, deletedAt: Date.now() } : todo
            )
        );
        toast.success('Todo moved to recycle bin', {
            action: {
                label: 'Undo',
                onClick: () => restoreTodo(id)
            }
        });
    }, [setTodos]);

    const restoreTodo = useCallback((id: string) => {
        setTodos(current =>
            (current || []).map(todo =>
                todo.id === id ? { ...todo, deletedAt: undefined } : todo
            )
        );
        toast.success('Todo restored');
    }, [setTodos]);

    const permanentlyDeleteTodo = useCallback(async (id: string) => {
        // Delete from Supabase if user is logged in
        if (user) {
            try {
                const { error } = await supabase
                    .from('todos')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Failed to delete todo from database:', error);
                    toast.error('Failed to delete todo from database');
                    return;
                }
            } catch (error) {
                console.error('Failed to delete todo:', error);
                toast.error('Failed to delete todo');
                return;
            }
        }

        // Update local state
        setTodos(current => (current || []).filter(todo => todo.id !== id));
        setPermanentDeleteId(null);
        toast.success('Todo permanently deleted');
    }, [setTodos, user]);

    const emptyRecycleBin = useCallback(async () => {
        const deletedTodos = (todos || []).filter(todo => todo.deletedAt);
        
        // Delete from Supabase if user is logged in
        if (user && deletedTodos.length > 0) {
            try {
                const deletedIds = deletedTodos.map(todo => todo.id);
                const { error } = await supabase
                    .from('todos')
                    .delete()
                    .in('id', deletedIds)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Failed to empty recycle bin in database:', error);
                    toast.error('Failed to empty recycle bin from database');
                    return;
                }
            } catch (error) {
                console.error('Failed to empty recycle bin:', error);
                toast.error('Failed to empty recycle bin');
                return;
            }
        }

        // Update local state
        setTodos(current => (current || []).filter(todo => !todo.deletedAt));
        toast.success('Recycle bin emptied');
    }, [setTodos, user, todos]);

    const openLinkDialog = useCallback((todoId: string) => {
        setSelectedTodoId(todoId);
        setIsLinkDialogOpen(true);
    }, []);

    const handleSaveLinks = useCallback((noteIds: string[]) => {
        if (!selectedTodoId) return;

        setTodos(current =>
            (current || []).map(todo =>
                todo.id === selectedTodoId
                    ? { ...todo, linkedNoteIds: noteIds, updatedAt: Date.now() }
                    : todo
            )
        );
        toast.success('Notes linked successfully');
    }, [selectedTodoId, setTodos]);

    const handleViewNotes = useCallback((todoId: string) => {
        setViewingNotesForTodo(todoId);
    }, []);

    const handlePreviewNote = useCallback((noteId: string) => {
        setPreviewNoteId(noteId);
    }, []);

    const handleClosePreview = useCallback(() => {
        setPreviewNoteId(null);
    }, []);

    const startResizingLinkedNotes = useCallback(() => {
        isResizingLinkedNotes.current = true;
    }, []);

    const startResizingPreview = useCallback(() => {
        isResizingPreview.current = true;
    }, []);

    const stopResizing = useCallback(() => {
        isResizingLinkedNotes.current = false;
        isResizingPreview.current = false;
    }, []);

    const removeGroupFromTodo = useCallback((todo: Todo, groupId: string): Todo => ({
        ...todo,
        groupIds: (todo.groupIds || []).filter(id => id !== groupId)
    }), []);

    const toggleGroupAssignment = useCallback((todo: Todo, groupId: string): Todo => {
        const groupIds = todo.groupIds || [];
        const hasGroup = groupIds.includes(groupId);
        return {
            ...todo,
            groupIds: hasGroup ? groupIds.filter(id => id !== groupId) : [...groupIds, groupId],
            updatedAt: Date.now()
        };
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizingLinkedNotes.current) {
            const newWidth = globalThis.innerWidth - e.clientX;
            if (newWidth >= 300 && newWidth <= 600) {
                setLinkedNotesWidth(newWidth);
            }
        } else if (isResizingPreview.current) {
            const newWidth = globalThis.innerWidth - e.clientX;
            if (newWidth >= 300 && newWidth <= 700) {
                setPreviewPanelWidth(newWidth);
            }
        }
    }, []);

    useEffect(() => {
        globalThis.addEventListener('mousemove', resize);
        globalThis.addEventListener('mouseup', stopResizing);
        return () => {
            globalThis.removeEventListener('mousemove', resize);
            globalThis.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const createGroup = useCallback(() => {
        if (!newGroupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        const newGroup: TodoGroup = {
            id: uuidv4(),
            name: newGroupName.trim(),
            color: newGroupColor,
            createdAt: Date.now(),
            isDefault: false
        };

        setGroups(current => [...(current || []), newGroup]);
        setNewGroupName('');
        setNewGroupColor('#65c4a0');
        toast.success('Group created');
    }, [newGroupName, newGroupColor, setGroups]);

    const deleteGroup = useCallback((groupId: string) => {
        setGroups(current => (current || []).filter(g => g.id !== groupId));
        setTodos(current =>
            (current || []).map(todo => removeGroupFromTodo(todo, groupId))
        );
        setDeleteGroupId(null);
        if (activeTabValue === groupId) {
            setActiveTabValue('all');
        }
        toast.success('Group deleted');
    }, [setGroups, setTodos, activeTabValue, removeGroupFromTodo]);

    const startEditGroup = useCallback((group: TodoGroup) => {
        setEditingGroupId(group.id);
        setEditGroupName(group.name);
        setEditGroupColor(group.color);
    }, []);

    const cancelEditGroup = useCallback(() => {
        setEditingGroupId(null);
        setEditGroupName('');
        setEditGroupColor('');
    }, []);

    const saveEditGroup = useCallback(() => {
        if (!editingGroupId || !editGroupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        setGroups(current =>
            (current || []).map(group =>
                group.id === editingGroupId
                    ? { ...group, name: editGroupName.trim(), color: editGroupColor }
                    : group
            )
        );
        setEditingGroupId(null);
        setEditGroupName('');
        setEditGroupColor('');
        toast.success('Group updated');
    }, [editingGroupId, editGroupName, editGroupColor, setGroups]);

    const toggleTodoGroup = useCallback((todoId: string, groupId: string) => {
        setTodos(current =>
            (current || []).map(todo => {
                if (todo.id !== todoId) return todo;
                return toggleGroupAssignment(todo, groupId);
            })
        );
    }, [setTodos, toggleGroupAssignment]);

    const updateTodoTags = useCallback((todoId: string, tags: string[]) => {
        setTodos(current =>
            (current || []).map(todo =>
                todo.id === todoId
                    ? { ...todo, tags, updatedAt: Date.now() }
                    : todo
            )
        );
    }, [setTodos]);

    const updateTodoDueDate = useCallback((todoId: string, dueDate: number | undefined) => {
        setTodos(current =>
            (current || []).map(todo =>
                todo.id === todoId
                    ? { ...todo, dueDate, updatedAt: Date.now() }
                    : todo
            )
        );
        if (dueDate) {
            toast.success('Due date set');
        } else {
            toast.success('Due date cleared');
        }
    }, [setTodos]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in globalThis && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Sync todos with service worker for background notifications
    useEffect(() => {
        if (!todos || !navigator.serviceWorker?.controller) return;

        // Send todos to service worker
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_TODOS',
            todos: todos
        });
    }, [todos]);

    // Listen for messages from service worker
    useEffect(() => {
        if (!navigator.serviceWorker) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'COMPLETE_TODO') {
                toggleTodo(event.data.todoId);
            }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, [toggleTodo]);

    // Check for overdue todos and send notifications (fallback for when SW is not active)
    useEffect(() => {
        if (!todos || Notification.permission !== 'granted') return;

        const checkInterval = setInterval(() => {
            const now = Date.now();
            todos.forEach(todo => {
                if (
                    todo.dueDate &&
                    !todo.completed &&
                    !todo.deletedAt &&
                    todo.dueDate <= now &&
                    todo.dueDate > now - 60000 // Only notify if overdue within last minute
                ) {
                    new Notification('Todo Overdue!', {
                        body: `"${todo.title}" is now overdue`,
                        icon: '/favicon.ico',
                        tag: todo.id,
                    });
                }
            });
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }, [todos]);

    const customGroups = useMemo(() => {
        return (groups || []).filter(g => !g.isDefault).sort((a, b) => b.createdAt - a.createdAt);
    }, [groups]);

    // Get all unique tags from all todos
    const allTags = useMemo(() => {
        if (!todos) return [];
        const tagSet = new Set<string>();
        todos.forEach(todo => {
            if (!todo.deletedAt && todo.tags) {
                todo.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    }, [todos]);

    // Set initial tab from query param
    useEffect(() => {
        if (initialGroup) {
            isSettingFromUrl.current = true;
            const normalizedGroup = initialGroup.toLowerCase();
            if (normalizedGroup === 'active' || normalizedGroup === 'completed' || normalizedGroup === 'all') {
                setActiveTabValue(normalizedGroup);
            } else {
                // Check if it's a custom group ID or name
                const customGroup = customGroups.find(
                    g => g.id === initialGroup || g.name.toLowerCase() === normalizedGroup
                );
                if (customGroup) {
                    setActiveTabValue(customGroup.id);
                }
            }
            // Reset the flag after a short delay to allow state update
            setTimeout(() => {
                isSettingFromUrl.current = false;
            }, 0);
        }
    }, [initialGroup, customGroups]);

    const resolveGroupName = useCallback((value: string) => {
        if (value === 'all' || value === 'active' || value === 'completed') {
            return value;
        }
        const group = customGroups.find(g => g.id === value);
        return group ? group.name : value;
    }, [customGroups]);

    const getGroupNamesForTodo = useCallback((todo: Todo) => {
        if (!todo.groupIds?.length) return [];
        return todo.groupIds
            .map(id => customGroups.find(g => g.id === id)?.name)
            .filter(Boolean) as string[];
    }, [customGroups]);

    // Sync URL query param when tab changes (only for user interactions)
    useEffect(() => {
        if (!activeTabValue || isSettingFromUrl.current) return;

        const currentGroup = searchParams.get('todoGroup');
        const groupName = resolveGroupName(activeTabValue);

        const shouldUpdate = activeTabValue === 'all'
            ? currentGroup !== null
            : currentGroup?.toLowerCase() !== groupName.toLowerCase();

        if (!shouldUpdate) return;

        const params = new URLSearchParams(searchParams);
        if (groupName === 'all') {
            params.delete('todoGroup');
        } else {
            params.set('todoGroup', groupName);
        }
        setSearchParams(params, { replace: true });
    }, [activeTabValue, resolveGroupName, searchParams, setSearchParams]);

    const getTodosForGroup = useCallback((groupId: string) => {
        if (!todos) return [];
        const groupTodos = todos
            .filter(todo => !todo.deletedAt && (todo.groupIds || []).includes(groupId))
            .sort((a, b) => b.createdAt - a.createdAt);
        return filterTodosByTag(groupTodos);
    }, [todos, selectedTagFilter]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            createTodo();
        }
    };

    const handleGroupKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            createGroup();
        }
    };

    const downloadTodos = useCallback(() => {
        let todosToExport: Todo[] = [];
        let filename: string;

        // Determine which todos to export based on active tab
        if (activeTabValue === 'all') {
            todosToExport = allTodos;
            filename = 'all-todos.txt';
        } else if (activeTabValue === 'active') {
            todosToExport = incompleteTodos;
            filename = 'active-todos.txt';
        } else if (activeTabValue === 'completed') {
            todosToExport = completedTodos;
            filename = 'completed-todos.txt';
        } else {
            // Custom group
            todosToExport = getTodosForGroup(activeTabValue);
            const group = customGroups.find(g => g.id === activeTabValue);
            filename = group
                ? `${group.name.toLowerCase().trim().split(/\s+/).join('-')}-todos.txt`
                : 'group-todos.txt';
        }

        if (todosToExport.length === 0) {
            toast.error('No todos to export');
            return;
        }

        // Format todos as text
        let content = `Todo List Export\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Total: ${todosToExport.length}\n`;
        content += `\n${'='.repeat(60)}\n\n`;

        todosToExport.forEach((todo, index) => {
            content += `${index + 1}. ${todo.completed ? '[✓]' : '[ ]'} ${todo.title}\n`;
            
            if (todo.tags && todo.tags.length > 0) {
                content += `   Tags: ${todo.tags.map(t => '#' + t).join(', ')}\n`;
            }
            
            if (todo.groupIds && todo.groupIds.length > 0) {
                const groupNames = getGroupNamesForTodo(todo);
                if (groupNames.length > 0) {
                    content += `   Groups: ${groupNames.join(', ')}\n`;
                }
            }
            
            if (todo.linkedNoteIds && todo.linkedNoteIds.length > 0) {
                content += `   Linked Notes: ${todo.linkedNoteIds.length}\n`;
            }
            
            content += `   Created: ${new Date(todo.createdAt).toLocaleString()}\n`;
            content += `\n`;
        });

        // Create and download file
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        
        toast.success(`Exported ${todosToExport.length} todo(s) to ${filename}`);
    }, [activeTabValue, allTodos, incompleteTodos, completedTodos, getTodosForGroup, getGroupNamesForTodo]);

    const buildTodoHandlers = useCallback((todo: Todo) => ({
        onToggle: () => toggleTodo(todo.id),
        onDelete: (e: React.MouseEvent) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        },
        onLinkNotes: () => openLinkDialog(todo.id),
        onViewNotes: () => handleViewNotes(todo.id),
        onToggleGroup: (groupId: string) => toggleTodoGroup(todo.id, groupId),
        onUpdateTags: (tags: string[]) => updateTodoTags(todo.id, tags),
        onUpdateDueDate: (dueDate: number | undefined) => updateTodoDueDate(todo.id, dueDate)
    }), [deleteTodo, handleViewNotes, openLinkDialog, toggleTodo, toggleTodoGroup, updateTodoDueDate, updateTodoTags]);

    const renderTodoCard = useCallback((todo: Todo) => {
        const handlers = buildTodoHandlers(todo);
        return (
            <TodoCard
                key={todo.id}
                todo={todo}
                groups={customGroups}
                {...handlers}
            />
        );
    }, [buildTodoHandlers, customGroups]);

    return (
        <div className={`flex flex-col bg-background overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1 w-full'}`}>
            {!isFullscreen && (
            <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="px-6 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-foreground">Todo List</h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadTodos}
                            title="Download current todos as text file"
                        >
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsManageGroupsOpen(true)}
                        >
                            <FoldersIcon size={18} className="mr-1" />
                            Manage Groups
                        </Button>
                        <Sheet open={isRecycleBinOpen} onOpenChange={setIsRecycleBinOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="relative">
                                    <TrashIcon size={18} className="mr-1" />
                                    Recycle Bin
                                    {deletedTodos.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                                            {deletedTodos.length}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md">
                                <SheetHeader>
                                    <SheetTitle>Recycle Bin</SheetTitle>
                                    <SheetDescription>
                                        Deleted todos are kept here. You can restore or permanently delete them.
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-4">
                                    {deletedTodos.length > 0 && (
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
                                            {deletedTodos.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <TrashIcon size={48} className="mx-auto mb-3 text-muted-foreground/50" />
                                                    <p className="text-muted-foreground">No deleted todos</p>
                                                </div>
                                            ) : (
                                                deletedTodos.map(todo => (
                                                    <div
                                                        key={todo.id}
                                                        className="p-4 rounded-lg border border-border bg-card"
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-semibold text-base mb-1">
                                                                    {todo.title}
                                                                </h3>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Deleted {todo.deletedAt && new Date(todo.deletedAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => restoreTodo(todo.id)}
                                                                className="flex-1"
                                                            >
                                                                <ArrowCounterClockwiseIcon size={16} className="mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => setPermanentDeleteId(todo.id)}
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
                    </div>
                </div>
            </header>
            )}

            <div className="flex-1 flex overflow-hidden w-full">
                <div className="flex-1 flex flex-col min-w-0">
                    {!isFullscreen && (
                    <div className="p-4 border-b border-border shrink-0">
                        <div className="flex gap-2">
                            <Input
                                placeholder="What needs to be done?"
                                value={newTodoTitle}
                                onChange={(e) => setNewTodoTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 h-9"
                            />
                            <Button onClick={createTodo} className="bg-accent hover:bg-accent/90 h-9">
                                <PlusIcon size={16} weight="bold" className="mr-1" />
                                Add Todo
                            </Button>
                        </div>
                    </div>
                    )}

                    <Tabs value={activeTabValue} onValueChange={setActiveTabValue} className="flex-1 flex flex-col overflow-hidden relative">
                        {!isFullscreen && (
                        <div className="px-6 pt-3 shrink-0">
                            <ScrollArea className="w-full whitespace-nowrap">
                                <TabsList>
                                    <TabsTrigger value="all">
                                        All ({allTodos.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="active">
                                        Active ({incompleteTodos.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="completed">
                                        Completed ({completedTodos.length})
                                    </TabsTrigger>
                                    {customGroups.map(group => (
                                        <TabsTrigger key={group.id} value={group.id}>
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: group.color }}
                                                    aria-hidden="true"
                                                />
                                                {group.name} ({getTodosForGroup(group.id).length})
                                            </div>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </ScrollArea>
                        </div>
                        )}

                        {!isFullscreen && allTags.length > 0 && (
                            <div className="px-6 py-2 border-b border-border shrink-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">Filter by tag:</span>
                                    <Badge
                                        variant={selectedTagFilter === null ? "default" : "outline"}
                                        className="cursor-pointer h-6 text-xs"
                                        onClick={() => setSelectedTagFilter(null)}
                                    >
                                        All
                                    </Badge>
                                    {allTags.map(tag => (
                                        <Badge
                                            key={tag}
                                            variant={selectedTagFilter === tag ? "default" : "outline"}
                                            className="cursor-pointer h-6 text-xs"
                                            onClick={() => setSelectedTagFilter(tag)}
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <TabsContent value="all" className="flex-1 mt-0 overflow-hidden relative">
                            {/* Floating fullscreen button */}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                                className="absolute top-2 right-4 z-50 h-10 w-10 rounded-full shadow-lg bg-card/95 backdrop-blur-sm hover:bg-card"
                            >
                                {isFullscreen ? 'Exit' : 'Fullscreen'}
                            </Button>
                            <ScrollArea className="h-full">
                                <div className="px-6 py-4 space-y-4">
                                    {allTodos.length === 0 ? (
                                        <div className="text-center py-12">
                                            <CheckCircleIcon size={64} className="mx-auto mb-4 text-muted-foreground/50" />
                                            <h2 className="text-xl font-semibold mb-2 text-foreground">No todos yet</h2>
                                            <p className="text-muted-foreground">Add a new todo to get started</p>
                                        </div>
                                    ) : (
                                        groupedAllTodos.map(({ date, todos }) => (
                                            <div key={date} className="space-y-2">
                                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {date}
                                                </h3>
                                                <div className="space-y-2">
                                                    {todos.map(renderTodoCard)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="active" className="flex-1 mt-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="px-6 py-4 space-y-4">
                                    {incompleteTodos.length === 0 ? (
                                        <div className="text-center py-12">
                                            <CheckCircleIcon size={64} className="mx-auto mb-4 text-muted-foreground/50" />
                                            <h2 className="text-xl font-semibold mb-2 text-foreground">No active todos</h2>
                                            <p className="text-muted-foreground">Add a new todo to get started</p>
                                        </div>
                                    ) : (
                                        groupedIncompleteTodos.map(({ date, todos }) => (
                                            <div key={date} className="space-y-2">
                                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {date}
                                                </h3>
                                                <div className="space-y-2">
                                                    {todos.map(renderTodoCard)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="completed" className="flex-1 mt-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="px-6 py-4 space-y-6">
                                    {completedTodos.length === 0 ? (
                                        <div className="text-center py-12">
                                            <CheckCircleIcon size={64} className="mx-auto mb-4 text-muted-foreground/50" />
                                            <h2 className="text-xl font-semibold mb-2 text-foreground">No completed todos</h2>
                                            <p className="text-muted-foreground">Complete a todo to see it here</p>
                                        </div>
                                    ) : (
                                        groupedCompleteTodos.map(({ date, todos }) => (
                                            <div key={date} className="space-y-2">
                                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {date}
                                                </h3>
                                                <div className="space-y-2">
                                                    {todos.map(renderTodoCard)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {customGroups.map(group => (
                            <TabsContent key={group.id} value={group.id} className="flex-1 mt-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="px-6 py-4 space-y-4">
                                        {getTodosForGroup(group.id).length === 0 ? (
                                            <div className="text-center py-12">
                                                <TagIcon size={64} className="mx-auto mb-4 text-muted-foreground/50" />
                                                <h2 className="text-xl font-semibold mb-2 text-foreground">No todos in this group</h2>
                                                <p className="text-muted-foreground">Assign todos to this group to see them here</p>
                                            </div>
                                        ) : (
                                            groupTodosByDate(getTodosForGroup(group.id)).map(({ date, todos }) => (
                                                <div key={date} className="space-y-2">
                                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                                        {date}
                                                    </h3>
                                                    <div className="space-y-2">
                                                            {todos.map(renderTodoCard)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>

                {viewingNotesForTodo && (
                    <>
                        <button
                            type="button"
                            className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors shrink-0"
                            aria-label="Resize linked notes panel"
                            onMouseDown={startResizingLinkedNotes}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    startResizingLinkedNotes();
                                }
                            }}
                        />
                        <div
                            className="shrink-0 overflow-hidden"
                            style={{ width: `${linkedNotesWidth}px` }}
                        >
                            <LinkedNotesView
                                notes={linkedNotesForViewing}
                                onClose={() => setViewingNotesForTodo(null)}
                                onNavigateToNote={onNavigateToNote}
                                onPreviewNote={handlePreviewNote}
                            />
                        </div>
                    </>
                )}

                {previewNoteId && (
                    <>
                        <button
                            type="button"
                            className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors shrink-0"
                            aria-label="Resize note preview panel"
                            onMouseDown={startResizingPreview}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    startResizingPreview();
                                }
                            }}
                        />
                        <div
                            className="shrink-0 overflow-hidden"
                            style={{ width: `${previewPanelWidth}px` }}
                        >
                            <NotePreviewPanel
                                note={previewNote}
                                onClose={handleClosePreview}
                                onNavigateToNote={onNavigateToNote}
                            />
                        </div>
                    </>
                )}
            </div>

            <NoteLinkDialog
                open={isLinkDialogOpen}
                onOpenChange={setIsLinkDialogOpen}
                notes={activeNotes}
                selectedNoteIds={
                    selectedTodoId
                        ? todos?.find(t => t.id === selectedTodoId)?.linkedNoteIds || []
                        : []
                }
                onSave={handleSaveLinks}
            />

            <AlertDialog open={permanentDeleteId !== null} onOpenChange={() => setPermanentDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently Delete Todo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the todo from the recycle bin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => permanentDeleteId && permanentlyDeleteTodo(permanentDeleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Forever
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Groups</DialogTitle>
                        <DialogDescription>
                            Create and manage custom groups for your todos. The default groups (All, Active, Completed) cannot be modified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <Label htmlFor="group-name">New Group</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="group-name"
                                    placeholder="Group name..."
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    onKeyDown={handleGroupKeyDown}
                                    className="flex-1"
                                />
                                <input
                                    type="color"
                                    value={newGroupColor}
                                    onChange={(e) => setNewGroupColor(e.target.value)}
                                    className="w-12 h-10 rounded-md border border-input cursor-pointer"
                                    title="Pick color"
                                />
                                <Button onClick={createGroup} size="icon">
                                    <PlusIcon size={18} weight="bold" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Custom Groups</Label>
                            <ScrollArea className="h-[240px] rounded-md border border-border p-3">
                                <div className="space-y-2">
                                    {customGroups.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No custom groups yet
                                        </div>
                                    ) : (
                                        customGroups.map(group => (
                                            <div
                                                key={group.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors gap-2"
                                            >
                                                {editingGroupId === group.id ? (
                                                    <>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <input
                                                                type="color"
                                                                value={editGroupColor}
                                                                onChange={(e) => setEditGroupColor(e.target.value)}
                                                                className="w-8 h-8 rounded-md border border-input cursor-pointer"
                                                                title="Pick color"
                                                            />
                                                            <Input
                                                                value={editGroupName}
                                                                onChange={(e) => setEditGroupName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveEditGroup();
                                                                    if (e.key === 'Escape') cancelEditGroup();
                                                                }}
                                                                className="flex-1 h-8"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={saveEditGroup}
                                                                className="h-8 w-8 text-primary hover:text-primary"
                                                            >
                                                                <CheckIcon size={16} weight="bold" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={cancelEditGroup}
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <XIcon size={16} />
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <div
                                                                className="w-4 h-4 rounded-full shrink-0"
                                                                style={{ backgroundColor: group.color }}
                                                            />
                                                            <span className="font-medium">{group.name}</span>
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                                                {getTodosForGroup(group.id).length}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => startEditGroup(group)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <PencilSimpleIcon size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setDeleteGroupId(group.id)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <TrashIcon size={16} />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsManageGroupsOpen(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteGroupId !== null} onOpenChange={() => setDeleteGroupId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the group and unassign it from all todos. Todos will not be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteGroupId && deleteGroup(deleteGroupId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Group
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
