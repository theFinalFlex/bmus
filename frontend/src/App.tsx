import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

// Layout components
import MainLayout from '@/components/Layout/MainLayout';
import AuthLayout from '@/components/Layout/AuthLayout';

// Page components
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import Profile from '@/pages/Profile';
import Certifications from '@/pages/Certifications';
import CertificationCatalog from '@/pages/Certifications/Catalog';
import AddCertification from '@/pages/Certifications/Add';
import Search from '@/pages/Search';
import Reports from '@/pages/Reports';
import Users from '@/pages/Users';
import Settings from '@/pages/Settings';
import CareerPath from '@/pages/CareerPath';
import BountyBoard from '@/pages/BountyBoard';
import AdminApprovals from '@/pages/Admin/Approvals';
import CertificationManagement from '@/pages/Admin/CertificationManagement';
import BountyManagement from '@/pages/Admin/BountyManagement';

// Loading component
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 ErrorBoundary: Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary: Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.log('🚨 ErrorBoundary: Rendering error fallback UI');
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" paragraph>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Application
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles = []
}) => {
  const { isAuthenticated, hasRole, loading, user } = useAuth();

  console.log('🛡️ ProtectedRoute: Checking access');
  console.log('🛡️ ProtectedRoute: Loading:', loading);
  console.log('🛡️ ProtectedRoute: IsAuthenticated:', isAuthenticated);
  console.log('🛡️ ProtectedRoute: User:', user?.email || 'null');
  console.log('🛡️ ProtectedRoute: Required roles:', roles);

  if (loading) {
    console.log('🛡️ ProtectedRoute: Showing loading spinner');
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    console.log('🛡️ ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(roles)) {
    console.log('🛡️ ProtectedRoute: Insufficient roles, redirecting to dashboard');
    console.log('🛡️ ProtectedRoute: User role:', user?.role);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🛡️ ProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};

// Public Route component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { loading, isAuthenticated, user } = useAuth();

  console.log('🎯 App: Rendering App component');
  console.log('🎯 App: Loading state:', loading);
  console.log('🎯 App: IsAuthenticated:', isAuthenticated);
  console.log('🎯 App: User:', user?.email || 'null');

  if (loading) {
    console.log('🎯 App: Showing loading spinner');
    return <LoadingSpinner />;
  }

  console.log('🎯 App: Rendering main routes');
  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicRoute>
              <AuthLayout>
                <Login />
              </AuthLayout>
            </PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute>
              <AuthLayout>
                <Register />
              </AuthLayout>
            </PublicRoute>
          } />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/certifications" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Certifications />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/certifications/catalog" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <CertificationCatalog />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/certifications/add" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <AddCertification />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/search" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Search />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/career-path" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <CareerPath />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/bounty-board" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <BountyBoard />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute roles={['MANAGER', 'ADMIN', 'HR']}>
              <ErrorBoundary>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute roles={['ADMIN']}>
              <ErrorBoundary>
                <MainLayout>
                  <Users />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/admin/approvals" element={
            <ProtectedRoute roles={['ADMIN']}>
              <ErrorBoundary>
                <MainLayout>
                  <AdminApprovals />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/admin/certifications" element={
            <ProtectedRoute roles={['ADMIN']}>
              <ErrorBoundary>
                <MainLayout>
                  <CertificationManagement />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/admin/bounties" element={
            <ProtectedRoute roles={['ADMIN']}>
              <ErrorBoundary>
                <MainLayout>
                  <BountyManagement />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 fallback */}
          <Route path="*" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout>
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                  </Box>
                </MainLayout>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
        </Routes>
      </Box>
    </ErrorBoundary>
  );
};

export default App;