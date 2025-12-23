import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  Panel,
  ReactFlowInstance,
  useEdgesState,
  useNodesState
} from 'reactflow';
import { Menu, Item, useContextMenu, ItemParams } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLineRightIcon, FlowArrowIcon, GraphIcon, ListPlusIcon, MoonIcon, ShareNetworkIcon, TargetIcon, TreeStructureIcon, GoogleLogoIcon, SignOutIcon, SunIcon } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/providers/AuthProvider';
import { useTodos, useWorkflows } from '@/hooks/use-data-sync';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Workflow } from '@/lib/types';

type NodeStatus = 'idea' | 'in-progress' | 'blocked' | 'done';

type WorkflowNodeData = {
  title: string;
  context: string;
  owner?: string;
  status: NodeStatus;
  tags: string[];
  color: string;
  todos: string[];
};

type WorkflowEdgeData = {
  label?: string;
  directed: boolean;
};

type WorkflowMeta = {
  title: string;
  summary: string;
  tags: string[];
};

type WorkflowState = {
  meta: WorkflowMeta;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge<WorkflowEdgeData>[];
  lastSaved: number;
};

const statusPalette: Record<NodeStatus, { fill: string; border: string; badge: string }> = {
  idea: { fill: '#ecfeff', border: '#38bdf8', badge: 'bg-cyan-100 text-cyan-700' },
  'in-progress': { fill: '#eef2ff', border: '#818cf8', badge: 'bg-indigo-100 text-indigo-700' },
  blocked: { fill: '#fff1f2', border: '#fb7185', badge: 'bg-rose-100 text-rose-700' },
  done: { fill: '#f0fdf4', border: '#22c55e', badge: 'bg-emerald-100 text-emerald-700' }
};

function statusBadge(status: NodeStatus) {
  const palette = statusPalette[status];
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide', palette.badge)}>
      {status.replace('-', ' ')}
    </span>
  );
}

function WorkflowNode({ data }: { data: WorkflowNodeData }) {
  const palette = statusPalette[data.status];

  return (
    <div
      className="rounded-xl border shadow-sm text-left min-w-[180px] max-w-[240px] bg-card"
      style={{
        borderColor: palette.border,
        boxShadow: '0 10px 28px rgba(0,0,0,0.08)'
      }}
    >
      <Handle type="source" position={Position.Top} id="top" className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-primary !w-3 !h-3" />
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex size-2.5 rounded-full" style={{ background: data.color }} />
          <p className="font-semibold text-sm truncate" title={data.title}>
            {data.title}
          </p>
        </div>
        {statusBadge(data.status)}
      </div>
      <p className="text-xs text-muted-foreground px-3 pt-1 pb-2 line-clamp-3" title={data.context}>
        {data.context || 'Add context to make this actionable.'}
      </p>
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-3">
          {data.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[11px] rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
              {tag}
            </span>
          ))}
          {data.tags.length > 3 && (
            <span className="text-[11px] text-muted-foreground">+{data.tags.length - 3}</span>
          )}
        </div>
      )}
      {data.todos.length > 0 && (
        <div className="flex items-center gap-1 px-3 pb-3 text-[11px] text-muted-foreground">
          <ListPlusIcon size={12} />
          <span>
            {data.todos.length} {data.todos.length === 1 ? 'todo' : 'todos'}
          </span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-primary !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNode };

const defaultEdges: Edge<WorkflowEdgeData>[] = [
  {
    id: 'e-research-plan',
    source: 'research',
    target: 'plan',
    type: 'smoothstep',
    label: 'shapes',
    data: { directed: true },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8', width: 18, height: 18 },
    style: { stroke: '#818cf8', strokeWidth: 2 }
  },
  {
    id: 'e-plan-build',
    source: 'plan',
    target: 'build',
    type: 'smoothstep',
    label: 'feeds',
    data: { directed: true },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8', width: 18, height: 18 },
    style: { stroke: '#818cf8', strokeWidth: 2 }
  },
  {
    id: 'e-build-launch',
    source: 'build',
    target: 'launch',
    type: 'smoothstep',
    label: 'ships',
    data: { directed: true },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e', width: 18, height: 18 },
    style: { stroke: '#22c55e', strokeWidth: 2 }
  },
  {
    id: 'e-launch-research',
    source: 'launch',
    target: 'research',
    type: 'smoothstep',
    label: 'learning loop',
    data: { directed: false },
    markerStart: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
    style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '6 4' }
  }
];

const defaultMeta: WorkflowMeta = {
  title: 'Workflow pilot',
  summary: 'Design and communicate how ideas turn into shipped outcomes.',
  tags: ['flow', 'team', 'planning']
};

function parseTags(raw: string) {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function sanitizeWorkflowState(state: WorkflowState): WorkflowState {
  const cleanMeta: WorkflowMeta = {
    title: state.meta.title || '',
    summary: state.meta.summary || '',
    tags: Array.isArray(state.meta.tags) ? state.meta.tags.filter(Boolean) : []
  };

  const cleanNodes: Node<WorkflowNodeData>[] = (state.nodes || []).map((node) => {
    const tags = Array.isArray(node.data.tags) ? node.data.tags : [];
    const todos = Array.isArray(node.data.todos) ? node.data.todos : [];

    return {
      id: node.id,
      type: node.type,
      position: node.position,
      sourcePosition: node.sourcePosition,
      targetPosition: node.targetPosition,
      data: {
        title: node.data.title || 'Untitled node',
        context: node.data.context || '',
        owner: node.data.owner || '',
        status: node.data.status || 'idea',
        tags,
        color: node.data.color || '#c7d2fe',
        todos
      }
    } as Node<WorkflowNodeData>;
  });

  const cleanEdges: Edge<WorkflowEdgeData>[] = (state.edges || []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    label: edge.label,
    data: { directed: edge.data?.directed ?? false },
    markerStart: edge.markerStart,
    markerEnd: edge.markerEnd,
    style: edge.style
  }));

  return {
    meta: cleanMeta,
    nodes: cleanNodes,
    edges: cleanEdges,
    lastSaved: state.lastSaved
  };
}

function edgeWithDirection(
  connection: Pick<Connection, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
  directed: boolean,
  label?: string
): Edge<WorkflowEdgeData> {
  const base: Edge<WorkflowEdgeData> = {
    id: `e-${connection.source}-${connection.target}-${crypto.randomUUID()}`,
    source: connection.source || '',
    target: connection.target || '',
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: 'smoothstep',
    label,
    data: { directed }
  };

  if (directed) {
    return {
      ...base,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 18, height: 18 },
      style: { stroke: '#6366f1', strokeWidth: 2 }
    };
  }

  return {
    ...base,
    markerStart: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 },
    style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '6 4' }
  };
}

export function WorkflowBuilder() {
  const { user, actionLoading, isSkipped, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const { workflowId } = useParams<{ workflowId: string }>();
  const { theme, toggleTheme } = useTheme();
  const { workflows, setWorkflows, dataMode } = useWorkflows();
  const { todos } = useTodos();

  const [loadedWorkflow, setLoadedWorkflow] = useState<Workflow | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(true);
  const [workflowNotFound, setWorkflowNotFound] = useState(false);

  // Fetch workflow data from database or localStorage
  useEffect(() => {
    if (!workflowId) return;

    const fetchWorkflow = async () => {
      setIsLoadingWorkflow(true);
      setWorkflowNotFound(false);
      
      if (dataMode === 'remote' && user) {
        // Fetch from Supabase
        try {
          const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // Workflow not found
              console.log('Workflow not found in database');
              setLoadedWorkflow(null);
              setWorkflowNotFound(true);
            } else {
              throw error;
            }
          } else if (data) {
            setLoadedWorkflow({
              id: data.id,
              name: data.name,
              data: data.data,
              createdAt: new Date(data.created_at).getTime(),
              updatedAt: new Date(data.updated_at).getTime(),
              todos: data.todos || [],
            });
            setWorkflowNotFound(false);
          }
        } catch (error) {
          console.error('Failed to load workflow from database:', error);
          toast.error('Failed to load workflow');
          setWorkflowNotFound(true);
        }
      } else {
        // Load from localStorage
        try {
          const workflowData = localStorage.getItem(`workflow:${workflowId}`);
          const summariesRaw = localStorage.getItem('workflows-list');
          const summaries = summariesRaw ? JSON.parse(summariesRaw) : [];
          const summary = summaries.find((s: any) => s.id === workflowId);
          
          if (workflowData && summary) {
            setLoadedWorkflow({
              id: workflowId,
              name: summary.name,
              data: JSON.parse(workflowData),
              createdAt: summary.createdAt || Date.now(),
              updatedAt: summary.updatedAt || Date.now(),
              todos: summary.todos || [],
            });
            setWorkflowNotFound(false);
          } else {
            // Workflow not found locally
            setLoadedWorkflow(null);
            setWorkflowNotFound(true);
          }
        } catch (error) {
          console.error('Failed to load workflow from localStorage:', error);
          setLoadedWorkflow(null);
          setWorkflowNotFound(true);
        }
      }
      
      setIsLoadingWorkflow(false);
    };

    fetchWorkflow();
  }, [workflowId, user?.id, dataMode]);

  const initialState = useMemo(() => {
    const normalizeNodes = (rawNodes?: Node<WorkflowNodeData>[]) =>
      (rawNodes || []).map((node) => {
        const tags = Array.isArray((node.data as any)?.tags) ? (node.data as any).tags : [];
        const todosForNode = Array.isArray((node.data as any)?.todos) ? (node.data as any).todos : [];
        return {
          ...node,
          data: {
            title: (node.data as any)?.title ?? 'Untitled node',
            context: (node.data as any)?.context ?? '',
            owner: (node.data as any)?.owner ?? '',
            status: (node.data as any)?.status ?? 'idea',
            tags,
            color: (node.data as any)?.color ?? '#c7d2fe',
            todos: todosForNode
          }
        };
      });

    if (loadedWorkflow?.data) {
      const data = loadedWorkflow.data as WorkflowState;
      return {
        meta: {
          title: data.meta?.title || loadedWorkflow?.name || 'Untitled Workflow',
          summary: data.meta?.summary || '',
          tags: data.meta?.tags || []
        },
        nodes: normalizeNodes(data.nodes || []),
        edges: data.edges || [],
        lastSaved: data.lastSaved || Date.now()
      } as WorkflowState;
    }

    return {
      meta: { title: loadedWorkflow?.name || 'Untitled Workflow', summary: '', tags: [] },
      nodes: [],
      edges: [],
      lastSaved: Date.now()
    } as WorkflowState;
  }, [loadedWorkflow]);

  const [workflowState, setWorkflowState] = useState<WorkflowState>(initialState);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdgeData>(initialState.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialState.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [meta, setMeta] = useState<WorkflowMeta>(initialState.meta);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newNodeDraft, setNewNodeDraft] = useState({
    title: 'New node',
    context: '',
    status: 'idea' as NodeStatus,
    color: '#c7d2fe',
    owner: '',
    tags: ''
  });
  const [connectConfig, setConnectConfig] = useState({ directed: true, label: 'flows to' });
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isResizingSidebar = useRef(false);
  const { show } = useContextMenu<{ edgeId: string }>({ id: 'edge-menu' });
  const { show: showNodeMenu } = useContextMenu<{ nodeId: string }>({ id: 'node-menu' });
  const lastSavedStateRef = useRef<string>('');
  const activeTodos = useMemo(() => (todos || []).filter((t) => !t.deletedAt), [todos]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 18, height: 18 }
  }), []);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance((prev) => prev ?? instance);
    // Mark as initialized after React Flow is ready
    setIsInitialized(true);
  }, []);

  // Update state when workflow is loaded
  useEffect(() => {
    if (!isLoadingWorkflow && loadedWorkflow?.data) {
      const data = loadedWorkflow.data as WorkflowState;
      setMeta(data.meta || { title: loadedWorkflow.name || 'Untitled Workflow', summary: '', tags: [] });
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setWorkflowState(data);
    } else if (!isLoadingWorkflow && !loadedWorkflow) {
      // New workflow - keep empty state
      setMeta({ title: 'Untitled Workflow', summary: '', tags: [] });
      setNodes([]);
      setEdges([]);
    }
  }, [loadedWorkflow, isLoadingWorkflow, setNodes, setEdges]);

  // Persist workflow state and update last saved timestamp
  useEffect(() => {
    // Only persist after component is initialized to prevent loops on mount
    if (!isInitialized || !workflowId) return;

    const now = Date.now();
    const sanitizedState = sanitizeWorkflowState({ meta, nodes, edges, lastSaved: now });
    const workflowTodos = Array.from(new Set(sanitizedState.nodes.flatMap((n) => n.data.todos || [])));

    // Check if the state actually changed by comparing JSON strings
    const newStateString = JSON.stringify({ meta: sanitizedState.meta, nodes: sanitizedState.nodes, edges: sanitizedState.edges });
    if (newStateString === lastSavedStateRef.current) {
      return; // No changes, skip save
    }

    console.log('Workflow state changed, will save after debounce');

    // Update the last saved state reference
    lastSavedStateRef.current = newStateString;
    setWorkflowState(sanitizedState);

    // Use a timeout to debounce saves and prevent infinite loops
    const timeoutId = setTimeout(async () => {
      console.log('Saving workflow:', workflowId, 'with', sanitizedState.nodes.length, 'nodes and', sanitizedState.edges.length, 'edges');
      await setWorkflows((list) => {
        const existingWorkflow = (list || []).find((w) => w.id === workflowId);
        
        if (existingWorkflow) {
          // Update existing workflow
          return (list || []).map((w) =>
            w.id === workflowId
              ? {
                ...w,
                name: meta.title || 'Untitled Workflow',
                data: sanitizedState,
                updatedAt: now,
                todos: workflowTodos
              }
              : w
          );
        } else {
          // Create new workflow if it doesn't exist
          return [
            ...(list || []),
            {
              id: workflowId,
              name: meta.title || 'Untitled Workflow',
              data: sanitizedState,
              createdAt: now,
              updatedAt: now,
              todos: workflowTodos
            }
          ];
        }
      });
      console.log('Workflow save completed');
    }, 300); // Increased debounce time to 300ms

    return () => clearTimeout(timeoutId);
  }, [meta, nodes, edges, workflowId, isInitialized, setWorkflows]);

  useEffect(() => {
    if (!selectedNode && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNode]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Use the actual handles from the connection, with sensible defaults
      // Default sourceHandle to 'bottom' and targetHandle to 'top' for bottom-to-top flow
      const conn = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || 'bottom',
        targetHandle: connection.targetHandle || 'top'
      };
      const edge = edgeWithDirection(conn, connectConfig.directed, connectConfig.label || undefined);
      setEdges((eds) => addEdge(edge, eds));
      toast.success('Edge created');
    },
    [connectConfig.directed, connectConfig.label, setEdges]
  );

  const deleteEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    if (selectedEdgeId === id) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId, setEdges]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge<WorkflowEdgeData>) => {
    event.preventDefault();
    setSelectedEdgeId(edge.id);
    show({ event, props: { edgeId: edge.id } });
  }, [show]);

  const deleteNodeById = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    toast.success('Node deleted');
  }, [selectedNodeId, setNodes, setEdges]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    showNodeMenu({ event, props: { nodeId: node.id } });
  }, [showNodeMenu]);

  const addNode = useCallback(async () => {
    if (!newNodeDraft.title.trim()) {
      toast.error('Add a title before creating a node.');
      return;
    }

    const position = reactFlowInstance?.screenToFlowPosition({ x: 300 + Math.random() * 200, y: 200 + Math.random() * 180 }) ?? {
      x: 120 + Math.random() * 200,
      y: 120 + Math.random() * 160
    };

    const node: Node<WorkflowNodeData> = {
      id: crypto.randomUUID(),
      type: 'workflow',
      position,
      data: {
        title: newNodeDraft.title.trim(),
        context: newNodeDraft.context.trim() || 'Add context to clarify what this node owns.',
        status: newNodeDraft.status,
        owner: newNodeDraft.owner.trim(),
        tags: parseTags(newNodeDraft.tags),
        color: newNodeDraft.color,
        todos: []
      }
    };

    const updatedNodes = [...nodes, node];
    setNodes(updatedNodes);
    setSelectedNodeId(node.id);
    setNewNodeDraft({ title: 'New node', context: '', status: 'idea', color: '#c7d2fe', owner: '', tags: '' });
    toast.success('Node created');

    // Immediately save to backend
    if (workflowId) {
      const now = Date.now();
      const sanitizedState = sanitizeWorkflowState({ meta, nodes: updatedNodes, edges, lastSaved: now });
      const workflowTodos = Array.from(new Set(sanitizedState.nodes.flatMap((n) => n.data.todos || [])));

      await setWorkflows((list) => {
        const existingWorkflow = (list || []).find((w) => w.id === workflowId);
        
        if (existingWorkflow) {
          return (list || []).map((w) =>
            w.id === workflowId
              ? {
                ...w,
                name: meta.title || 'Untitled Workflow',
                data: sanitizedState,
                updatedAt: now,
                todos: workflowTodos
              }
              : w
          );
        } else {
          return [
            ...(list || []),
            {
              id: workflowId,
              name: meta.title || 'Untitled Workflow',
              data: sanitizedState,
              createdAt: now,
              updatedAt: now,
              todos: workflowTodos
            }
          ];
        }
      });
    }
  }, [newNodeDraft.color, newNodeDraft.context, newNodeDraft.owner, newNodeDraft.status, newNodeDraft.tags, newNodeDraft.title, reactFlowInstance, setNodes, nodes, workflowId, meta, edges, setWorkflows]);

  const updateSelectedNode = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n)));
    },
    [selectedNodeId, setNodes]
  );

  const toggleTodoForSelectedNode = useCallback(
    (todoId: string) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedNodeId) return n;
          const currentTodos = n.data.todos || [];
          const nextTodos = currentTodos.includes(todoId)
            ? currentTodos.filter((id) => id !== todoId)
            : [...currentTodos, todoId];
          return { ...n, data: { ...n.data, todos: nextTodos } };
        })
      );
    },
    [selectedNodeId, setNodes]
  );

  const startResizingSidebar = useCallback(() => {
    isResizingSidebar.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    isResizingSidebar.current = false;
  }, []);

  const resizeSidebar = useCallback((e: MouseEvent) => {
    if (isResizingSidebar.current) {
      const newWidth = e.clientX;
      if (newWidth >= 0 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resizeSidebar);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resizeSidebar, stopResizing]);


  // Show 404 if workflow not found
  if (workflowNotFound && !isLoadingWorkflow) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-card/70 backdrop-blur-md">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <GraphIcon size={16} />
                Workflow Not Found
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl font-bold text-muted-foreground">404</div>
            <h1 className="text-2xl font-semibold">Workflow Not Found</h1>
            <p className="text-muted-foreground max-w-md">
              The workflow you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={() => navigate('/workflows')} variant="default">
                <ShareNetworkIcon size={16} className="mr-2" />
                View All Workflows
              </Button>
              <Button onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur-md">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <GraphIcon size={16} />
              {meta.title || 'Workflow'}
            </Badge>
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/notes')}>
                <ArrowLineRightIcon size={16} className="mr-1 -scale-x-100" />
                Notes
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/todos')}>
                <ListPlusIcon size={16} className="mr-1" />
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/workflows')}>
                <ShareNetworkIcon size={16} className="mr-1" />
                All Workflows
              </Button>
            </div>
            <span className="text-sm text-muted-foreground hidden md:inline">
              Build graph views that link context, owners, and edges.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon size={18} aria-hidden="true" /> : <SunIcon size={18} aria-hidden="true" />}
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
                <SignOutIcon size={18} className="mr-1" />
                Sign out
              </Button>
            ) : isSkipped ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={signInWithGoogle}
                disabled={actionLoading}
              >
                <GoogleLogoIcon size={18} className="mr-1" />
                Sign in
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="border-r border-border bg-card/70 backdrop-blur-md" style={{ width: `${sidebarWidth}px` }}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Workflow overview</p>
                    {/* Title is editable below; avoid duplicate heading display */}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <ShareNetworkIcon size={14} />
                    Directed + loops
                  </Badge>
                </div>
                <Input
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  placeholder="Workflow title"
                />
                <Textarea
                  value={meta.summary}
                  onChange={(e) => setMeta((m) => ({ ...m, summary: e.target.value }))}
                  placeholder="What does this workflow help you reason about?"
                  className="min-h-[80px]"
                />
                <Input
                  value={meta.tags.join(', ')}
                  onChange={(e) => setMeta((m) => ({ ...m, tags: parseTags(e.target.value) }))}
                  placeholder="Tags (comma separated)"
                />
                <div className="flex flex-wrap gap-1">
                  {meta.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </section>

              <section className="space-y-3 border rounded-lg border-border bg-background/60 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TreeStructureIcon size={16} />
                  Add node
                </div>
                <Input
                  value={newNodeDraft.title}
                  onChange={(e) => setNewNodeDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Title"
                />
                <Textarea
                  value={newNodeDraft.context}
                  onChange={(e) => setNewNodeDraft((d) => ({ ...d, context: e.target.value }))}
                  placeholder="Context, owner, links, risks..."
                  className="min-h-[80px]"
                />
                <Input
                  value={newNodeDraft.owner}
                  onChange={(e) => setNewNodeDraft((d) => ({ ...d, owner: e.target.value }))}
                  placeholder="Owner (optional)"
                />
                <Input
                  value={newNodeDraft.tags}
                  onChange={(e) => setNewNodeDraft((d) => ({ ...d, tags: e.target.value }))}
                  placeholder="Tags (comma separated)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={newNodeDraft.status}
                    onValueChange={(value) => setNewNodeDraft((d) => ({ ...d, status: value as NodeStatus }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="in-progress">In progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Color</span>
                    <Input
                      type="color"
                      className="h-9"
                      value={newNodeDraft.color}
                      onChange={(e) => setNewNodeDraft((d) => ({ ...d, color: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={addNode} className="w-full bg-accent hover:bg-accent/90">
                  <FlowArrowIcon size={16} className="mr-1" />
                  Create node
                </Button>
              </section>

              <section className="space-y-3 border rounded-lg border-border bg-background/60 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TargetIcon size={16} />
                  Selected node
                </div>
                {!selectedNode && <p className="text-sm text-muted-foreground">Select a node to edit its context.</p>}
                {selectedNode && (
                  <div className="space-y-2">
                    <Input
                      value={selectedNode.data.title}
                      onChange={(e) => updateSelectedNode({ title: e.target.value })}
                    />
                    <Textarea
                      value={selectedNode.data.context}
                      onChange={(e) => updateSelectedNode({ context: e.target.value })}
                      className="min-h-[90px]"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Status:</span>
                      {statusBadge(selectedNode.data.status)}
                    </div>
                    <Select
                      value={selectedNode.data.status}
                      onValueChange={(value) => updateSelectedNode({ status: value as NodeStatus })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">Idea</SelectItem>
                        <SelectItem value="in-progress">In progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={selectedNode.data.owner || ''}
                      onChange={(e) => updateSelectedNode({ owner: e.target.value })}
                      placeholder="Owner"
                    />
                    <Input
                      value={selectedNode.data.tags.join(', ')}
                      onChange={(e) => updateSelectedNode({ tags: parseTags(e.target.value) })}
                      placeholder="Tags"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Linked todos</span>
                        {selectedNode.data.todos.length > 0 && (
                          <Badge variant="outline">{selectedNode.data.todos.length} linked</Badge>
                        )}
                      </div>
                      {activeTodos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Create todos to attach them to this node.</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {activeTodos.map((todo) => {
                            const checked = selectedNode.data.todos.includes(todo.id);
                            return (
                              <label
                                key={todo.id}
                                className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 hover:border-border"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleTodoForSelectedNode(todo.id)}
                                  aria-label={checked ? 'Unlink todo' : 'Link todo'}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm truncate">{todo.title}</div>
                                  <div className="text-xs text-muted-foreground">{todo.completed ? 'Completed' : 'Open'}</div>
                                </div>
                                {todo.completed && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Done
                                  </Badge>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
        <div
          className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors shrink-0"
          onMouseDown={startResizingSidebar}
        />
        <div className="flex-1 w-full h-full min-h-0 bg-gradient-to-br from-background via-background to-accent/5">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
            onEdgeContextMenu={handleEdgeContextMenu}
            nodeTypes={nodeTypes}
            fitView
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={defaultEdgeOptions}
            onInit={handleInit}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodeContextMenu={handleNodeContextMenu}
            proOptions={{ hideAttribution: true }}
            className=""
          >
            <Background gap={20} color="var(--border)" />
            <MiniMap nodeColor={(node) => node.data.color} />
            <Controls showZoom showFitView />
            <Panel position="top-right" className="bg-card/80 border border-border shadow-lg rounded-lg p-3">
              <div className="text-xs text-muted-foreground">
                {dataMode === 'remote' ? 'Auto-saves to cloud' : 'Auto-saves locally'}
              </div>
              <div className="text-sm font-medium">Last saved: {new Date(workflowState.lastSaved).toLocaleTimeString()}</div>
              {dataMode === 'remote' && user?.email && (
                <div className="text-xs text-muted-foreground mt-1">
                  Synced for {user.email.split('@')[0]}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={connectConfig.directed}
                  onCheckedChange={(checked) => setConnectConfig((c) => ({ ...c, directed: checked }))}
                />
                <span>{connectConfig.directed ? 'New edges directed' : 'New edges undirected'}</span>
              </div>
              <Input
                value={connectConfig.label}
                onChange={(e) => setConnectConfig((c) => ({ ...c, label: e.target.value }))}
                placeholder="Default edge label"
                className="mt-2 h-8"
              />
              <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}>
                <TreeStructureIcon size={16} className="mr-1" />
                Fit view
              </Button>
            </Panel>
            <Menu id="edge-menu" className="text-sm">
              <Item onClick={(params: ItemParams<{ edgeId: string }>) => params.props?.edgeId && deleteEdge(params.props.edgeId)}>
                Delete edge
              </Item>
            </Menu>
            <Menu id="node-menu" className="text-sm">
              <Item onClick={(params: ItemParams<{ nodeId: string }>) => params.props?.nodeId && deleteNodeById(params.props.nodeId)}>
                Delete node
              </Item>
            </Menu>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

