import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/notes" element={<App />} />
      <Route path="/notes/:noteId" element={<App />} />
      <Route path="/todos" element={<App />} />
      <Route path="/" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
