import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useProfile } from "@/lib/useProfile";

// First-time gate: until the user completes onboarding (a confirmed profile for
// their account type), every protected route redirects to /onboarding.
// Onboarding itself is full-screen (no app chrome) and cannot be skipped. Once
// the profile is confirmed, /onboarding redirects to the dashboard.
export default function OnboardingGuard() {
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const confirmed = !!profile?.confirmed;
  const onOnboarding = location.pathname.startsWith("/onboarding");

  if (!confirmed && !onOnboarding) return <Navigate to="/onboarding" replace />;
  if (confirmed && onOnboarding) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}