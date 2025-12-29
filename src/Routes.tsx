import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import AppLayout from './AppLayout';
import { AuthCallback } from './AuthCallback';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { NotesApp } from './components/NotesApp';
import { TodoApp } from './components/TodoApp';
import { WorkflowsHome } from './components/WorkflowsHome';

type LayoutContext = { navigateToNote: (noteId: string) => void };

function TodosRoute() {
  const { navigateToNote } = useOutletContext<LayoutContext>();
  return <TodoApp onNavigateToNote={navigateToNote} />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Shared layout with header + auth gating */}
      <Route element={<AppLayout />}>
        <Route path="/notes" element={<NotesApp />} />
        <Route path="/notes/:noteId" element={<NotesApp />} />
        <Route path="/todos" element={<TodosRoute />} />
        <Route path="/workflows" element={<WorkflowsHome />} />
      </Route>
      <Route path="/workflows/:workflowId" element={<WorkflowBuilder />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
