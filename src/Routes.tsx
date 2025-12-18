import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import { AuthCallback } from './AuthCallback';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WorkflowsHome } from './components/WorkflowsHome';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/notes" element={<AppLayout />} />
      <Route path="/notes/:noteId" element={<AppLayout />} />
      <Route path="/todos" element={<AppLayout />} />
      <Route path="/workflows" element={<AppLayout />} />
      <Route path="/workflows/:workflowId" element={<WorkflowBuilder />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
