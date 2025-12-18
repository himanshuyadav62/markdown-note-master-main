import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkflows } from '@/hooks/use-data-sync';
import { SparkleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';

export function WorkflowsHome() {
  const navigate = useNavigate();
  const { workflows, setWorkflows, deleteWorkflow: deleteWorkflowRemote } = useWorkflows();
  const [newName, setNewName] = useState('');

  const sorted = useMemo(() => [...workflows].sort((a, b) => b.updatedAt - a.updatedAt), [workflows]);

  const createWorkflow = () => {
    const name = newName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const now = Date.now();
    setWorkflows((arr) => [{
      id,
      name,
      data: null,
      createdAt: now,
      updatedAt: now,
      todos: []
    }, ...(arr || [])]);
    setNewName('');
    navigate(`/workflows/${id}`);
  };

  const deleteWorkflow = async (id: string) => {
    await deleteWorkflowRemote(id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full">
      <div className="border-b border-border px-6 py-4 bg-card/30 shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workflow name"
            className="max-w-sm"
          />
          <Button onClick={createWorkflow} className="bg-accent hover:bg-accent/90">
            <PlusIcon size={16} className="mr-1" />
            Create
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
          <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <SparkleIcon size={48} className="mx-auto mb-3 text-muted-foreground/60" />
                <p className="text-muted-foreground">No workflows yet. Create one to get started.</p>
              </div>
            ) : (
              sorted.map((w) => (
                <Card key={w.id} className="transition hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="truncate">{w.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-3">Updated {new Date(w.updatedAt).toLocaleString()}</div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/workflows/${w.id}`)}>Open</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteWorkflow(w.id)}>
                        <TrashIcon size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
    </div>
  );
}
