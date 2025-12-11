import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WorkflowsHome } from './components/WorkflowsHome';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/notes" element={<App />} />
      <Route path="/notes/:noteId" element={<App />} />
      <Route path="/todos" element={<App />} />
      <Route path="/workflows" element={<WorkflowsHome />} />
      <Route path="/workflows/:workflowId" element={<WorkflowBuilder />} />
      <Route path="/" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
