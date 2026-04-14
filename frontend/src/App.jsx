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
const EvidenceGalleryPage = lazy(() => import('./pages/admin/EvidenceGalleryPage'));
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
      
      // Only validate if we have credentials
      if (storedUser && storedToken) {
        try {
          await checkAuth();
        } catch (error) {
          // If checkAuth throws, the store should have been updated inside checkAuth
          // Just continue and let the state determine access
          console.warn('[ProtectedRoute] Auth validation error:', error);
        }
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

  if (!currentAuth) {
    // Double check localStorage as fallback
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      // We have credentials but state says not authenticated
      // Try to parse user and allow access (optimistic)
      try {
        const parsedUser = JSON.parse(storedUser);
        if (adminOnly && parsedUser.role !== 'ADMIN') {
          return <Navigate to="/dashboard" replace />;
        }
        // Allow access - backend will validate on subsequent API calls
        return children;
      } catch (e) {
        // Invalid JSON in localStorage, clear and redirect
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('csrf_token');
        return <Navigate to="/login" replace />;
      }
    }

    return <Navigate to="/login" replace />;
  }

  if (adminOnly && currentUser?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

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

            <Route path="/admin/exams/:examId/evidence" element={
              <ProtectedRoute adminOnly>
                <MainLayout>
                  <EvidenceGalleryPage />
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
