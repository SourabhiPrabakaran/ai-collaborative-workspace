import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

// Lazy load pages for performance
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage.jsx'));
const PublicDocumentPage = lazy(() => import('./pages/PublicDocumentPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Guest Route: Redirect authenticated users away from Login/Signup
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <SocketProvider>
              <Suspense fallback={<LoadingScreen message="Loading page assets..." />}>
              <Routes>
                {/* Guest-only routes */}
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <Login />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <GuestRoute>
                      <Signup />
                    </GuestRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspace/:workspaceId"
                  element={
                    <ProtectedRoute>
                      <WorkspacePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspace/:workspaceId/document/:documentId"
                  element={
                    <ProtectedRoute>
                      <WorkspacePage />
                    </ProtectedRoute>
                  }
                />

                {/* Public read-only route */}
                <Route path="/public/document/:token" element={<PublicDocumentPage />} />

                {/* 404 Route */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
