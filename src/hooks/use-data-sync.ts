import { useEffect, useMemo, useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Note, Attachment, Todo, TodoGroup } from '@/lib/types';
import { toast } from 'sonner';

type DataMode = 'local' | 'remote';

interface UseNotesResult {
  notes: Note[];
  setNotes: (notes: Note[] | ((prev: Note[]) => Note[])) => Promise<void>;
  dataMode: DataMode;
}

export function useNotes(): UseNotesResult {
  const { user } = useAuth();
  const [notes, setNotesState] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dataMode: DataMode = user ? 'remote' : 'local';

  // Load notes from localStorage
  const loadLocalNotes = useCallback(() => {
    try {
      const stored = localStorage.getItem('notes');
      setNotesState(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load local notes:', error);
      setNotesState([]);
    }
    setIsLoading(false);
  }, []);

  // Load notes from Supabase
  const loadRemoteNotes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotesState(
        (data || []).map((note: any) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: new Date(note.created_at).getTime(),
          updatedAt: new Date(note.updated_at).getTime(),
          deletedAt: note.deleted_at ? new Date(note.deleted_at).getTime() : undefined,
          attachments: [],
        }))
      );
    } catch (error) {
      console.error('Failed to load remote notes:', error);
      toast.error('Failed to load notes from Supabase');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load notes on mount and when user changes
  useEffect(() => {
    if (dataMode === 'local') {
      loadLocalNotes();
    } else if (dataMode === 'remote') {
      loadRemoteNotes();
    }
  }, [dataMode, loadLocalNotes, loadRemoteNotes]);

  // Save notes
  const setNotes = useCallback(
    async (
      notesOrUpdater: Note[] | ((prev: Note[]) => Note[])
    ): Promise<void> => {
      const nextNotes =
        typeof notesOrUpdater === 'function'
          ? notesOrUpdater(notes)
          : notesOrUpdater;

      setNotesState(nextNotes);

      if (dataMode === 'local') {
        try {
          localStorage.setItem('notes', JSON.stringify(nextNotes));
        } catch (error) {
          console.error('Failed to save local notes:', error);
          toast.error('Failed to save notes');
        }
      } else if (dataMode === 'remote' && user) {
        // Sync with Supabase
        try {
          // For simplicity, we'll do individual upserts
          for (const note of nextNotes) {
            const { error } = await supabase.from('notes').upsert({
              id: note.id,
              user_id: user.id,
              title: note.title,
              content: note.content,
              created_at: new Date(note.createdAt).toISOString(),
              updated_at: new Date(note.updatedAt).toISOString(),
              deleted_at: note.deletedAt
                ? new Date(note.deletedAt).toISOString()
                : null,
            });

            if (error) throw error;
          }
        } catch (error) {
          console.error('Failed to save remote notes:', error);
          toast.error('Failed to save notes to Supabase');
        }
      }
    },
    [notes, dataMode, user]
  );

  return {
    notes,
    setNotes,
    dataMode,
  };
}

interface UseTodosResult {
  todos: Todo[];
  setTodos: (todos: Todo[] | ((prev: Todo[]) => Todo[])) => Promise<void>;
  dataMode: DataMode;
}

export function useTodos(): UseTodosResult {
  const { user } = useAuth();
  const [todos, setTodosState] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dataMode: DataMode = user ? 'remote' : 'local';

  // Load todos from localStorage
  const loadLocalTodos = useCallback(() => {
    try {
      const stored = localStorage.getItem('todos');
      setTodosState(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load local todos:', error);
      setTodosState([]);
    }
    setIsLoading(false);
  }, []);

  // Load todos from Supabase
  const loadRemoteTodos = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTodosState(
        (data || []).map((todo: any) => ({
          id: todo.id,
          title: todo.title,
          completed: todo.completed,
          createdAt: new Date(todo.created_at).getTime(),
          updatedAt: new Date(todo.updated_at).getTime(),
          deletedAt: todo.deleted_at
            ? new Date(todo.deleted_at).getTime()
            : undefined,
          linkedNoteIds: [],
          groupIds: todo.group_ids || [],
          tags: todo.tags || [],
        }))
      );
    } catch (error) {
      console.error('Failed to load remote todos:', error);
      toast.error('Failed to load todos from Supabase');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load todos on mount and when user changes
  useEffect(() => {
    if (dataMode === 'local') {
      loadLocalTodos();
    } else if (dataMode === 'remote') {
      loadRemoteTodos();
    }
  }, [dataMode, loadLocalTodos, loadRemoteTodos]);

  // Save todos
  const setTodos = useCallback(
    async (
      todosOrUpdater: Todo[] | ((prev: Todo[]) => Todo[])
    ): Promise<void> => {
      const nextTodos =
        typeof todosOrUpdater === 'function'
          ? todosOrUpdater(todos)
          : todosOrUpdater;

      setTodosState(nextTodos);

      if (dataMode === 'local') {
        try {
          localStorage.setItem('todos', JSON.stringify(nextTodos));
        } catch (error) {
          console.error('Failed to save local todos:', error);
          toast.error('Failed to save todos');
        }
      } else if (dataMode === 'remote' && user) {
        try {
          for (const todo of nextTodos) {
            const { error } = await supabase.from('todos').upsert({
              id: todo.id,
              user_id: user.id,
              title: todo.title,
              completed: todo.completed,
              created_at: new Date(todo.createdAt).toISOString(),
              updated_at: new Date(todo.updatedAt).toISOString(),
              deleted_at: todo.deletedAt
                ? new Date(todo.deletedAt).toISOString()
                : null,
              group_ids: todo.groupIds || [],
              tags: todo.tags || [],
            });

            if (error) throw error;
          }
        } catch (error) {
          console.error('Failed to save remote todos:', error);
          toast.error('Failed to save todos to Supabase');
        }
      }
    },
    [todos, dataMode, user]
  );

  return {
    todos,
    setTodos,
    dataMode,
  };
}
