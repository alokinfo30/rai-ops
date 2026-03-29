import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './Login';
import Register from './Register';
import ResetPassword from './ResetPassword';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './Dashboard';
import RedTeam from './RedTeam';
import Monitoring from './Monitoring';
import KnowledgeBase from './KnowledgeBase';
import Reports from './Reports';
import Settings from './Settings';
import Profile from './Profile';
import TestComparison from './TestComparison';
import AdminFeedback from './AdminFeedback';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="rai-ops-theme">
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
               {/* Main Layout wrapper for dashboard pages */}
               <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/red-team" element={<RedTeam />} />
                  <Route path="/monitoring" element={<Monitoring />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/red-team/compare" element={<TestComparison />} />
                <Route path="/admin/feedback" element={<AdminFeedback />} />
               </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;