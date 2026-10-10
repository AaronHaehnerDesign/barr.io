import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import BusinessDashboard from '@/pages/BusinessDashboard';
import Onboarding from '@/pages/Onboarding';
import MyPersona from '@/pages/MyPersona';
import Results from '@/pages/Results';
import MapView from '@/pages/MapView';
import Compare from '@/pages/Compare';
import AreaDetail from '@/pages/AreaDetail';
import MyProfile from '@/pages/MyProfile';
import DataInsights from '@/pages/DataInsights';
import SavedComparisons from '@/pages/SavedComparisons';
import Glossary from '@/pages/Glossary';
import DataSources from '@/pages/DataSources';
import Apartments from '@/pages/Apartments';
import AppLayout from '@/components/AppLayout';
import OnboardingGuard from '@/components/OnboardingGuard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<OnboardingGuard />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/business-dashboard" element={<BusinessDashboard />} />
            <Route path="/results" element={<Results />} />
            <Route path="/priorities" element={<Navigate to="/my-persona" replace />} />
            <Route path="/my-persona" element={<MyPersona />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/area/:type/:id" element={<AreaDetail />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/data-insights" element={<DataInsights />} />
            <Route path="/saved-comparisons" element={<SavedComparisons />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/persona-library" element={<Navigate to="/my-persona?tab=library" replace />} />
            <Route path="/apartments" element={<Apartments />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App