import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicForm from './pages/PublicForm';
import TrackReport from './pages/TrackReport';
import Login from './pages/admin/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Reports from './pages/admin/Reports';
import ReportDetail from './pages/admin/ReportDetail';
import Categories from './pages/admin/Categories';
import Branches from './pages/admin/Branches';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicForm />} />
          <Route path="/acompanhar" element={<TrackReport />} />
          <Route path="/consultar" element={<TrackReport />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="ouvidorias" element={<Reports />} />
              <Route path="ouvidorias/:id" element={<ReportDetail />} />
              <Route path="categorias" element={<Categories />} />
              <Route path="unidades" element={<Branches />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="auditoria" element={<AuditLogs />} />
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
