import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ExamPage = lazy(() => import('./pages/exam/ExamPage'));
const ResultDetailPage = lazy(() => import('./pages/exam/ResultDetailPage'));
const AdminExamsListPage = lazy(() => import('./pages/admin/AdminExamsListPage'));
const CreateExamPage = lazy(() => import('./pages/admin/CreateExamPage'));
const ExamManagePage = lazy(() => import('./pages/admin/ExamManagePage'));
const StudentManagementPage = lazy(() => import('./pages/admin/StudentManagementPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Student routes */}

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainLayout>
                <StudentDashboard />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/exam/:examId" element={
            <ProtectedRoute>
              <MainLayout>
                <ExamPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/results/:attemptId" element={
            <ProtectedRoute>
              <MainLayout>
                <ResultDetailPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/exams" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <AdminExamsListPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/exams/new" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <CreateExamPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/exams/:examId" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <ExamManagePage />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/students" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <StudentManagementPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/analytics" element={
            <ProtectedRoute adminOnly>
              <MainLayout>
                <AnalyticsPage />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
