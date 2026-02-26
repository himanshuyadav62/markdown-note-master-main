import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Note, Todo, TodoGroup, Workflow } from '@/lib/types';
import { toast } from 'sonner';

type DataMode = 'local' | 'remote';

interface UseNotesResult {
  notes: Note[];
  setNotes: (notes: Note[] | ((prev: Note[]) => Note[])) => Promise<void>;
  dataMode: DataMode;
  refetch: () => Promise<void>;
}

export function useNotes(): UseNotesResult {
  const { user } = useAuth();
  const [notes, setNotesState] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const dataMode: DataMode = user ? 'remote' : 'local';

  // Load notes from localStorage
  const loadLocalNotes = useCallback(async () => {
    try {
      const stored = localStorage.getItem('notes');
      setNotesState(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load local notes:', error);
      setNotesState([]);
    }
    setIsLoading(false);
    setHasLoaded(true);
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
      setHasLoaded(true);
    }
  }, [user]);

  // Load notes on mount and when user changes
  useEffect(() => {
    // Only load if we haven't already loaded
    if (hasLoaded) return;
    
    if (dataMode === 'local') {
      loadLocalNotes();
    } else if (dataMode === 'remote') {
      loadRemoteNotes();
    }
  }, [user?.id, hasLoaded]); // Only depend on user.id and hasLoaded to avoid dataMode changes triggering refetch

  const saveLocalNotes = useCallback(
    async (notesToSave: Note[]): Promise<void> => {
      try {
        localStorage.setItem('notes', JSON.stringify(notesToSave));
      } catch (error) {
        console.error('Failed to save local notes:', error);
        toast.error('Failed to save notes');
      }
    },
    []
  );

  const saveRemoteNotes = useCallback(
    async (nextNotes: Note[]): Promise<void> => {
      if (!user) return;
      try {
        const changedNotes = nextNotes.filter(nextNote => {
          const prevNote = notes.find(n => n.id === nextNote.id);
          return !prevNote || 
                 prevNote.title !== nextNote.title || 
                 prevNote.content !== nextNote.content ||
                 prevNote.deletedAt !== nextNote.deletedAt;
        });

        const deletedNoteIds = notes
          .filter(prevNote => !nextNotes.some(n => n.id === prevNote.id))
          .map(note => note.id);

        await upsertNotes(changedNotes);
        await deleteNotes(deletedNoteIds);
      } catch (error) {
        console.error('Failed to save remote notes:', error);
        toast.error('Failed to save notes to Supabase');
      }
    },
    [user, notes]
  );

  const upsertNotes = useCallback(
    async (changedNotes: Note[]): Promise<void> => {
      if (changedNotes.length === 0 || !user) return;
      const { error } = await supabase.from('notes').upsert(
        changedNotes.map(note => ({
          id: note.id,
          user_id: user.id,
          title: note.title,
          content: note.content,
          created_at: new Date(note.createdAt).toISOString(),
          updated_at: new Date(note.updatedAt).toISOString(),
          deleted_at: note.deletedAt
            ? new Date(note.deletedAt).toISOString()
            : null,
        }))
      );
      if (error) throw error;
    },
    [user]
  );

  const deleteNotes = useCallback(
    async (deletedNoteIds: string[]): Promise<void> => {
      if (deletedNoteIds.length === 0 || !user) return;
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', deletedNoteIds)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    [user]
  );

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

      const saveHandler = dataMode === 'local' ? saveLocalNotes : saveRemoteNotes;
      await saveHandler(nextNotes);
    },
    [notes, dataMode, saveLocalNotes, saveRemoteNotes]
  );

  const refetch = useCallback(
    () => dataMode === 'local' ? loadLocalNotes() : loadRemoteNotes(),
    [dataMode, loadLocalNotes, loadRemoteNotes]
  );

  return {
    notes,
    setNotes,
    dataMode,
    refetch,
  };
}

interface UseTodosResult {
  todos: Todo[];
  setTodos: (todos: Todo[] | ((prev: Todo[]) => Todo[])) => Promise<void>;
  dataMode: DataMode;
  refetch: () => Promise<void>;
}

export function useTodos(): UseTodosResult {
  const { user } = useAuth();
  const [todos, setTodosState] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const dataMode: DataMode = user ? 'remote' : 'local';

  // Load todos from localStorage
  const loadLocalTodos = useCallback(async () => {
    try {
      const stored = localStorage.getItem('todos');
      setTodosState(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load local todos:', error);
      setTodosState([]);
    }
    setIsLoading(false);
    setHasLoaded(true);
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
          dueDate: todo.due_date
            ? new Date(todo.due_date).getTime()
            : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to load remote todos:', error);
      toast.error('Failed to load todos from Supabase');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user]);

  // Load todos on mount and when user changes
  useEffect(() => {
    // Only load if we haven't already loaded
    if (hasLoaded) return;
    
    if (dataMode === 'local') {
      loadLocalTodos();
    } else if (dataMode === 'remote') {
      loadRemoteTodos();
    }
  }, [user?.id, hasLoaded]); // Only depend on user.id and hasLoaded to avoid dataMode changes triggering refetch

  const saveLocalTodos = useCallback(
    async (todosToSave: Todo[]): Promise<void> => {
      try {
        localStorage.setItem('todos', JSON.stringify(todosToSave));
      } catch (error) {
        console.error('Failed to save local todos:', error);
        toast.error('Failed to save todos');
      }
    },
    []
  );

  const upsertTodos = useCallback(
    async (changedTodos: Todo[]): Promise<void> => {
      if (changedTodos.length === 0 || !user) return;

      const { error } = await supabase.from('todos').upsert(
        changedTodos.map(todo => ({
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
          due_date: todo.dueDate
            ? new Date(todo.dueDate).toISOString()
            : null,
        }))
      );

      if (error) throw error;
    },
    [user]
  );

  const deleteTodos = useCallback(
    async (deletedTodoIds: string[]): Promise<void> => {
      if (deletedTodoIds.length === 0 || !user) return;

      const { error } = await supabase
        .from('todos')
        .delete()
        .in('id', deletedTodoIds)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    [user]
  );

  const saveRemoteTodos = useCallback(
    async (nextTodos: Todo[]): Promise<void> => {
      if (!user) return;

      try {
        const changedTodos = nextTodos.filter(nextTodo => {
          const prevTodo = todos.find(t => t.id === nextTodo.id);
          return (
            !prevTodo ||
            prevTodo.title !== nextTodo.title ||
            prevTodo.completed !== nextTodo.completed ||
            prevTodo.createdAt !== nextTodo.createdAt ||
            prevTodo.updatedAt !== nextTodo.updatedAt ||
            prevTodo.deletedAt !== nextTodo.deletedAt ||
            JSON.stringify(prevTodo.groupIds || []) !== JSON.stringify(nextTodo.groupIds || []) ||
            JSON.stringify(prevTodo.tags || []) !== JSON.stringify(nextTodo.tags || []) ||
            prevTodo.dueDate !== nextTodo.dueDate
          );
        });

        const deletedTodoIds = todos
          .filter(prevTodo => !nextTodos.some(todo => todo.id === prevTodo.id))
          .map(todo => todo.id);

        await upsertTodos(changedTodos);
        await deleteTodos(deletedTodoIds);
      } catch (error) {
        console.error('Failed to save remote todos:', error);
        toast.error('Failed to save todos to Supabase');
      }
    },
    [user, todos, upsertTodos, deleteTodos]
  );

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

      const saveHandler = dataMode === 'local' ? saveLocalTodos : saveRemoteTodos;
      await saveHandler(nextTodos);
    },
    [todos, dataMode, saveLocalTodos, saveRemoteTodos]
  );

  const refetch = useCallback(
    () => dataMode === 'local' ? loadLocalTodos() : loadRemoteTodos(),
    [dataMode, loadLocalTodos, loadRemoteTodos]
  );

  return {
    todos,
    setTodos,
    dataMode,
    refetch,
  };
}

interface UseTodoGroupsResult {
  groups: TodoGroup[];
  setGroups: (groups: TodoGroup[] | ((prev: TodoGroup[]) => TodoGroup[])) => Promise<void>;
  dataMode: DataMode;
  refetch: () => Promise<void>;
}

export function useTodoGroups(): UseTodoGroupsResult {
  const { user } = useAuth();
  const [groups, setGroupsState] = useState<TodoGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const dataMode: DataMode = user ? 'remote' : 'local';

  const loadLocalGroups = useCallback(async () => {
    try {
      const stored = localStorage.getItem('todo-groups');
      setGroupsState(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load local todo groups:', error);
      setGroupsState([]);
    }
    setIsLoading(false);
    setHasLoaded(true);
  }, []);

  const loadRemoteGroups = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('todo_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroupsState(
        (data || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          createdAt: new Date(g.created_at).getTime(),
          isDefault: !!g.is_default,
        }))
      );
    } catch (error) {
      console.error('Failed to load remote todo groups:', error);
      toast.error('Failed to load groups from Supabase');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (hasLoaded) return;
    if (dataMode === 'local') {
      loadLocalGroups();
    } else if (dataMode === 'remote') {
      loadRemoteGroups();
    }
  }, [user?.id, hasLoaded]);

  const setGroups = useCallback(
    async (
      groupsOrUpdater: TodoGroup[] | ((prev: TodoGroup[]) => TodoGroup[])
    ): Promise<void> => {
      const nextGroups =
        typeof groupsOrUpdater === 'function'
          ? (groupsOrUpdater as (prev: TodoGroup[]) => TodoGroup[])(groups)
          : groupsOrUpdater;

      setGroupsState(nextGroups);

      if (dataMode === 'local') {
        try {
          localStorage.setItem('todo-groups', JSON.stringify(nextGroups));
        } catch (error) {
          console.error('Failed to save local todo groups:', error);
          toast.error('Failed to save groups');
        }
      } else if (dataMode === 'remote' && user) {
        try {
          for (const group of nextGroups) {
            const { error } = await supabase.from('todo_groups').upsert({
              id: group.id,
              user_id: user.id,
              name: group.name,
              color: group.color,
              created_at: new Date(group.createdAt).toISOString(),
              is_default: !!group.isDefault,
            });
            if (error) throw error;
          }
        } catch (error) {
          console.error('Failed to save remote todo groups:', error);
          toast.error('Failed to save groups to Supabase');
        }
      }
    },
    [groups, dataMode, user]
  );

  const refetch = useCallback(
    () => (dataMode === 'local' ? loadLocalGroups() : loadRemoteGroups()),
    [dataMode, loadLocalGroups, loadRemoteGroups]
  );

  return { groups, setGroups, dataMode, refetch };
}

interface UseWorkflowsResult {
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[] | ((prev: Workflow[]) => Workflow[])) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  dataMode: DataMode;
  refetch: () => Promise<void>;
}

export function useWorkflows(): UseWorkflowsResult {
  const { user } = useAuth();
  const [workflows, setWorkflowsState] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const dataMode: DataMode = user ? 'remote' : 'local';

  // Load workflows from localStorage
  const loadLocalWorkflows = useCallback(async () => {
    try {
      const stored = localStorage.getItem('workflows-list');
      const summaries = stored ? JSON.parse(stored) : [];
      
      // Load full workflow data for each summary
      const fullWorkflows: Workflow[] = summaries.map((summary: any) => {
        const workflowData = localStorage.getItem(`workflow:${summary.id}`);
        return {
          id: summary.id,
          name: summary.name,
          data: workflowData ? JSON.parse(workflowData) : null,
          createdAt: summary.createdAt || summary.updatedAt,
          updatedAt: summary.updatedAt,
          todos: summary.todos || [],
        };
      });
      
      setWorkflowsState(fullWorkflows);
    } catch (error) {
      console.error('Failed to load local workflows:', error);
      setWorkflowsState([]);
    }
    setIsLoading(false);
    setHasLoaded(true);
  }, []);

  // Load workflows from Supabase
  const loadRemoteWorkflows = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .is('deleted_at', null)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflowsState(
        (data || []).map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          data: workflow.data,
          createdAt: new Date(workflow.created_at).getTime(),
          updatedAt: new Date(workflow.updated_at).getTime(),
          deletedAt: workflow.deleted_at
            ? new Date(workflow.deleted_at).getTime()
            : undefined,
          todos: workflow.todos || [],
        }))
      );
    } catch (error) {
      console.error('Failed to load remote workflows:', error);
      toast.error('Failed to load workflows from Supabase');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user]);

  // Load workflows on mount and when user changes
  useEffect(() => {
    // Only load if we haven't already loaded
    if (hasLoaded) return;
    
    if (dataMode === 'local') {
      loadLocalWorkflows();
    } else if (dataMode === 'remote') {
      loadRemoteWorkflows();
    }
  }, [user?.id, hasLoaded]); // Only depend on user.id and hasLoaded to avoid dataMode changes triggering refetch

  // Save local workflows
  const saveLocalWorkflows = useCallback(
    async (nextWorkflows: Workflow[]): Promise<void> => {
      try {
        const summaries = nextWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          updatedAt: w.updatedAt,
          createdAt: w.createdAt,
          todos: w.todos || [],
        }));
        localStorage.setItem('workflows-list', JSON.stringify(summaries));
        
        nextWorkflows.forEach(workflow => {
          if (workflow.data) {
            localStorage.setItem(`workflow:${workflow.id}`, JSON.stringify(workflow.data));
          }
        });
      } catch (error) {
        console.error('Failed to save local workflows:', error);
        toast.error('Failed to save workflows');
      }
    },
    []
  );

  // Convert workflow to database format
  const workflowToDb = useCallback(
    (workflow: Workflow) => ({
      id: workflow.id,
      user_id: user?.id,
      name: workflow.name,
      data: workflow.data,
      created_at: new Date(workflow.createdAt).toISOString(),
      updated_at: new Date(workflow.updatedAt).toISOString(),
      deleted_at: workflow.deletedAt
        ? new Date(workflow.deletedAt).toISOString()
        : null,
      todos: workflow.todos || [],
    }),
    [user]
  );

  // Upsert single workflow
  const upsertSingleWorkflow = useCallback(
    async (workflow: Workflow): Promise<void> => {
      console.log('Upserting workflow:', workflow.id, workflow.name);
      const { error } = await supabase.from('workflows').upsert(workflowToDb(workflow));
      if (error) {
        console.error('Error upserting workflow:', error);
        throw error;
      }
    },
    [workflowToDb]
  );

  // Save remote workflows
  const saveRemoteWorkflows = useCallback(
    async (nextWorkflows: Workflow[]): Promise<void> => {
      if (!user) return;
      try {
        console.log('Saving workflows to remote:', nextWorkflows.length);
        await Promise.all(nextWorkflows.map(upsertSingleWorkflow));
        console.log('All workflows saved successfully');
      } catch (error) {
        console.error('Failed to save remote workflows:', error);
        toast.error('Failed to save workflows to Supabase');
      }
    },
    [user, upsertSingleWorkflow]
  );

  // Save workflows
  const setWorkflows = useCallback(
    async (
      workflowsOrUpdater: Workflow[] | ((prev: Workflow[]) => Workflow[])
    ): Promise<void> => {
      const nextWorkflows =
        typeof workflowsOrUpdater === 'function'
          ? workflowsOrUpdater(workflows)
          : workflowsOrUpdater;

      setWorkflowsState(nextWorkflows);

      if (dataMode === 'local') {
        await saveLocalWorkflows(nextWorkflows);
      } else if (dataMode === 'remote') {
        await saveRemoteWorkflows(nextWorkflows);
      }
    },
    [workflows, dataMode, saveLocalWorkflows, saveRemoteWorkflows]
  );

  // Delete local workflow
  const deleteLocalWorkflow = useCallback(
    async (id: string): Promise<void> => {
      try {
        const summariesRaw = localStorage.getItem('workflows-list');
        const summaries = summariesRaw ? JSON.parse(summariesRaw) : [];
        const nextSummaries = (summaries || []).filter((s: any) => s.id !== id);
        localStorage.setItem('workflows-list', JSON.stringify(nextSummaries));
        localStorage.removeItem(`workflow:${id}`);
      } catch (error) {
        console.error('Failed to delete local workflow:', error);
        toast.error('Failed to delete workflow');
      }
    },
    []
  );

  // Delete remote workflow
  const deleteRemoteWorkflow = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('workflows')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete remote workflow:', error);
        toast.error('Failed to delete workflow from Supabase');
        await loadRemoteWorkflows();
      }
    },
    [user, loadRemoteWorkflows]
  );

  // Delete workflow (hard delete remotely, remove locally)
  const deleteWorkflow = useCallback(
    async (id: string): Promise<void> => {
      setWorkflowsState((prev) => (prev || []).filter((w) => w.id !== id));

      if (dataMode === 'local') {
        await deleteLocalWorkflow(id);
      } else if (dataMode === 'remote') {
        await deleteRemoteWorkflow(id);
      }
    },
    [dataMode, deleteLocalWorkflow, deleteRemoteWorkflow]
  );

  const refetch = useCallback(
    () => dataMode === 'local' ? loadLocalWorkflows() : loadRemoteWorkflows(),
    [dataMode, loadLocalWorkflows, loadRemoteWorkflows]
  );

  return {
    workflows,
    setWorkflows,
    deleteWorkflow,
    dataMode,
    refetch,
  };
}
