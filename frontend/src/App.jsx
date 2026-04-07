import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ExamPage = lazy(() => import('./pages/exam/ExamPage'));
const ResultDetailPage = lazy(() => import('./pages/exam/ResultDetailPage'));
const AdminExamsListPage = lazy(() => import('./pages/admin/AdminExamsListPage'));
const CreateExamPage = lazy(() => import('./pages/admin/CreateExamPage'));
const ExamManagePage = lazy(() => import('./pages/admin/ExamManagePage'));
const StudentManagementPage = lazy(() => import('./pages/admin/StudentManagementPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const AddQuestionPage = lazy(() => import('./pages/admin/AddQuestionPage'));
const EditQuestionPage = lazy(() => import('./pages/admin/EditQuestionPage'));
const EditExamPage = lazy(() => import('./pages/admin/EditExamPage'));
const ProctoringDashboardPage = lazy(() => import('./pages/admin/ProctoringDashboardPage'));
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
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [isValidating, setValidating] = useState(true);

  useEffect(() => {
    const validate = async () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      // Only validate if we have credentials; otherwise skip and let the sync state handle it
      if (storedUser && storedToken) {
        await checkAuth();
      }
      setValidating(false);
    };
    validate();
  }, [checkAuth]);

  if (isValidating) {
    return <PageLoader />;
  }

  const currentAuth = useAuthStore.getState().isAuthenticated;
  const currentUser = useAuthStore.getState().user;

  console.log('[ProtectedRoute] Checking auth:', { isAuthenticated: currentAuth, userRole: currentUser?.role, adminOnly });

  if (!currentAuth) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      console.log('[ProtectedRoute] State says not authenticated but localStorage has user, allowing access');
      if (adminOnly) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'ADMIN') {
          console.log('[ProtectedRoute] Admin-only route but user is not admin, redirecting to dashboard');
          return <Navigate to="/dashboard" replace />;
        }
      }
      return children;
    }

    console.log('[ProtectedRoute] No auth found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && currentUser?.role !== 'ADMIN') {
    console.log('[ProtectedRoute] Admin-only route but user is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[ProtectedRoute] Auth check passed, allowing access');
  return children;
};

function App() {
  return (
    <ErrorBoundary>
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

            <Route path="/profile" element={
              <ProtectedRoute>
                <MainLayout>
                  <ProfilePage />
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

            <Route path="/admin/exams/:examId/edit" element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <EditExamPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/exams/:examId/questions/new" element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <AddQuestionPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            <Route path="/admin/questions/:questionId/edit" element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <EditQuestionPage />
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

            <Route path="/admin/exams/:examId/proctoring" element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <ProctoringDashboardPage />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
