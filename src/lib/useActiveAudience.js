import { useAuth } from "@/lib/AuthContext";

// The account type (Personal / Business) is fixed at sign-up and stored on the
// user. There is no in-app switching — personal and business are separate
// accounts. This hook derives the audience (b2c/b2b) the rest of the app uses
// for profiles, conversations and indicators.
export function useActiveAudience() {
  const { user } = useAuth();
  const audience = user?.account_type === "business" ? "b2b" : "b2c";
  return { audience };
}