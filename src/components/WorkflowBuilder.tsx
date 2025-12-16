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
import { ArrowLineRightIcon, FlowArrowIcon, GraphIcon, ListPlusIcon, MoonIcon, ShareNetworkIcon, SparkleIcon, SunIcon, TargetIcon, TreeStructureIcon } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWorkflows } from '@/hooks/use-data-sync';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';

type NodeStatus = 'idea' | 'in-progress' | 'blocked' | 'done';

type WorkflowNodeData = {
  title: string;
  context: string;
  owner?: string;
  status: NodeStatus;
  tags: string[];
  color: string;
};

type WorkflowEdgeData = {
  label?: string;
  directed: boolean;
};

type WorkflowMeta = {
  title: string;
  summary: string;
  globalContext: string;
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
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-primary !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNode };

const defaultNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'research',
    type: 'workflow',
    position: { x: 80, y: 80 },
    data: {
      title: 'Discovery',
      context: 'Clarify the user problem, constraints, and success signals.',
      status: 'idea',
      tags: ['inputs', 'context'],
      color: '#38bdf8'
    }
  },
  {
    id: 'plan',
    type: 'workflow',
    position: { x: 360, y: 80 },
    data: {
      title: 'Shaping',
      context: 'Break work into thin slices, define acceptance, surface risks.',
      status: 'in-progress',
      tags: ['scope', 'alignment'],
      color: '#818cf8'
    }
  },
  {
    id: 'build',
    type: 'workflow',
    position: { x: 200, y: 240 },
    data: {
      title: 'Build',
      context: 'Implement, review quickly, keep PRs small, ship behind flags.',
      status: 'in-progress',
      tags: ['delivery'],
      color: '#f59e0b'
    }
  },
  {
    id: 'launch',
    type: 'workflow',
    position: { x: 500, y: 240 },
    data: {
      title: 'Launch & Measure',
      context: 'Release, measure impact, and capture learnings for the next cycle.',
      status: 'done',
      tags: ['impact', 'feedback'],
      color: '#22c55e'
    }
  }
];

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
  globalContext: 'Use this canvas to connect notes, tasks, owners, and risks. Keep edges directional when the output of one node is the input of another. Keep undirected edges for feedback loops.',
  tags: ['flow', 'team', 'planning']
};

const defaultState: WorkflowState = {
  meta: defaultMeta,
  nodes: defaultNodes,
  edges: defaultEdges,
  lastSaved: Date.now()
};

function parseTags(raw: string) {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
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
  const navigate = useNavigate();
  const { workflowId } = useParams<{ workflowId: string }>();
  const { theme, toggleTheme } = useTheme();
  const { workflows, setWorkflows } = useWorkflows();

  // Find current workflow
  const currentWorkflow = useMemo(() => 
    workflows.find(w => w.id === workflowId),
    [workflows, workflowId]
  );

  const initialState = useMemo(() => {
    if (currentWorkflow?.data) {
      return currentWorkflow.data as WorkflowState;
    }
    // Return empty workflow for new workflows
    return {
      meta: { title: currentWorkflow?.name || 'Untitled Workflow', summary: '', globalContext: '', tags: [] },
      nodes: [],
      edges: [],
      lastSaved: Date.now()
    } as WorkflowState;
  }, [currentWorkflow]);

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
  const [edgeDraft, setEdgeDraft] = useState({
    source: '',
    target: '',
    label: 'relates to',
    directed: true
  });
  const [connectConfig, setConnectConfig] = useState({ directed: true, label: 'flows to' });
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { show } = useContextMenu<{ edgeId: string }>({ id: 'edge-menu' });
  const lastSavedStateRef = useRef<string>('');

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

  // Persist workflow state and update last saved timestamp
  useEffect(() => {
    // Only persist after component is initialized to prevent loops on mount
    if (!isInitialized || !workflowId || !currentWorkflow) return;
    
    const now = Date.now();
    const newState = { meta, nodes, edges, lastSaved: now };
    
    // Check if the state actually changed by comparing JSON strings
    const newStateString = JSON.stringify({ meta, nodes, edges });
    if (newStateString === lastSavedStateRef.current) {
      return; // No changes, skip save
    }
    
    // Update the last saved state reference
    lastSavedStateRef.current = newStateString;
    setWorkflowState(newState);

    // Use a timeout to debounce saves and prevent infinite loops
    const timeoutId = setTimeout(async () => {
      await setWorkflows((list) => {
        const updated = (list || []).map((w) =>
          w.id === workflowId
            ? { ...w, name: meta.title || 'Untitled Workflow', data: newState, updatedAt: now }
            : w
        );
        return updated;
      });
    }, 300); // Increased debounce time to 300ms

    return () => clearTimeout(timeoutId);
  }, [meta, nodes, edges, workflowId, isInitialized]); // Removed currentWorkflow and setWorkflows from deps

  useEffect(() => {
    if (!selectedNode && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNode]);

  // Update edge draft source/target when nodes change and current selection is invalid
  useEffect(() => {
    if (nodes.length >= 2) {
      setEdgeDraft((d) => ({
        ...d,
        source: d.source && nodes.some((n) => n.id === d.source) ? d.source : nodes[0].id,
        target: d.target && nodes.some((n) => n.id === d.target) ? d.target : nodes[1].id
      }));
    } else if (nodes.length === 1) {
      setEdgeDraft((d) => ({
        ...d,
        source: nodes[0].id,
        target: ''
      }));
    }
  }, [nodes]);

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

  const addManualEdge = useCallback(() => {
    if (!edgeDraft.source || !edgeDraft.target || edgeDraft.source === edgeDraft.target) {
      toast.error('Choose two different nodes to connect.');
      return;
    }

    const edge = edgeWithDirection(
      { 
        source: edgeDraft.source, 
        target: edgeDraft.target, 
        sourceHandle: 'bottom', 
        targetHandle: 'top' 
      },
      edgeDraft.directed,
      edgeDraft.label || undefined
    );
    setEdges((eds) => [...eds, edge]);
    toast.success('Edge added');
  }, [edgeDraft.directed, edgeDraft.label, edgeDraft.source, edgeDraft.target, setEdges]);

  const addNode = useCallback(() => {
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
        color: newNodeDraft.color
      }
    };

    setNodes((nds) => [...nds, node]);
    setSelectedNodeId(node.id);
    setEdgeDraft((draft) => ({ ...draft, source: node.id }));
    setNewNodeDraft({ title: 'New node', context: '', status: 'idea', color: '#c7d2fe', owner: '', tags: '' });
    toast.success('Node created');
  }, [newNodeDraft.color, newNodeDraft.context, newNodeDraft.owner, newNodeDraft.status, newNodeDraft.tags, newNodeDraft.title, reactFlowInstance, setNodes]);

  const updateSelectedNode = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n)));
    },
    [selectedNodeId, setNodes]
  );

  const resetToDefault = useCallback(() => {
    setNodes(defaultNodes);
    setEdges(defaultEdges);
    setMeta(defaultMeta);
    setSelectedNodeId(defaultNodes[0].id);
    toast.success('Reset to starter workflow');
  }, [setEdges, setMeta, setNodes]);

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
            {/* removed demo reset to keep workflows user-owned */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon size={18} aria-hidden="true" /> : <SunIcon size={18} aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full sm:w-96 border-r border-border bg-card/70 backdrop-blur-md">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Workflow overview</p>
                    <h2 className="text-lg font-semibold">{meta.title}</h2>
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
                <Textarea
                  value={meta.globalContext}
                  onChange={(e) => setMeta((m) => ({ ...m, globalContext: e.target.value }))}
                  placeholder="Global context, constraints, links to docs, owners..."
                  className="min-h-[100px]"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ArrowLineRightIcon size={16} />
                    Connect nodes
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Directed
                    <Switch
                      checked={edgeDraft.directed}
                      onCheckedChange={(checked) => setEdgeDraft((d) => ({ ...d, directed: checked }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={edgeDraft.source}
                    onValueChange={(value) => setEdgeDraft((d) => ({ ...d, source: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.data.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={edgeDraft.target}
                    onValueChange={(value) => setEdgeDraft((d) => ({ ...d, target: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Target" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.data.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={edgeDraft.label}
                  onChange={(e) => setEdgeDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Label (handoff, depends on, informs...)"
                />
                <Button variant="outline" onClick={addManualEdge} className="w-full">
                  <FlowArrowIcon size={16} className="mr-1" />
                  Add edge
                </Button>
                <div className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  Tip: toggle directed edges for handoffs and undirected for feedback loops.
                </div>
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
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 relative bg-gradient-to-br from-background via-background to-accent/5" style={{ width: '100%', height: '100%' }}>
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
            proOptions={{ hideAttribution: true }}
            className=""
          >
            <Background gap={20} color="var(--border)" />
            <MiniMap nodeColor={(node) => node.data.color} />
            <Controls showZoom showFitView />
            <Panel position="top-right" className="bg-card/80 border border-border shadow-lg rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Auto-saves locally</div>
              <div className="text-sm font-medium">Last saved: {new Date(workflowState.lastSaved).toLocaleTimeString()}</div>
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
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

