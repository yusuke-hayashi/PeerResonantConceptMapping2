import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { MapsPage } from './pages/MapsPage';
import { MapEditorPage } from './pages/MapEditorPage';
import { TopicsPage } from './pages/TopicsPage';
import { StudentsPage } from './pages/StudentsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './App.css';

/**
 * Placeholder component for routes not yet implemented
 */
function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <h2>{title}</h2>
      <p>This page is under construction.</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/maps" element={<MapsPage />} />
              <Route path="/maps/:id" element={<MapEditorPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/comparisons" element={<Placeholder title="Comparisons" />} />
              <Route path="/students" element={<StudentsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
