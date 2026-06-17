import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist session in localStorage
    persistSession:     true,
    // Auto-refresh token before it expires
    autoRefreshToken:   true,
    // Detect session from URL (for OAuth / magic link)
    detectSessionInUrl: true,
  },
});

// ── Global auth error handler ──────────────────────────────────────────────────
// Catches "Invalid Refresh Token" / "Refresh Token Not Found" errors
// and redirects to /login so the user can sign in again.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (
      event === "SIGNED_OUT" ||
      event === "TOKEN_REFRESHED" && !session
    ) {
      // Clear any stale local storage keys
      localStorage.removeItem("smartrhu_user");
      localStorage.removeItem("userAvatar");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userId");
      window.location.href = "/login";
    }
  });

  // Also catch the token refresh error that fires as a console error
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    // Clone to read body without consuming it
    if (!response.ok) {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url.includes("/auth/v1/token") && response.status === 400) {
        const clone = response.clone();
        clone.json().then((body: any) => {
          if (
            body?.error_code === "refresh_token_not_found" ||
            body?.msg?.toLowerCase().includes("refresh token not found") ||
            body?.msg?.toLowerCase().includes("invalid refresh token")
          ) {
            localStorage.removeItem("smartrhu_user");
            localStorage.removeItem("userAvatar");
            localStorage.removeItem("userName");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userId");
            window.location.href = "/login";
          }
        }).catch(() => {});
      }
    }
    return response;
  };
}

export type UserRole =
  | "doctor"
  | "pharmacist"
  | "medtech"
  | "warehouse"
  | "registrar"
  | "admin";

export interface DBUser {
  user_id:        string;
  first_name:     string;
  middle_name?:   string;
  last_name:      string;
  email:          string;
  role:           UserRole;
  status:         string;
  is_first_login: boolean;
}

export function getRouteForRole(role: string): string {
  const routes: Record<string, string> = {
    doctor:     "/doctor",
    admin:      "/admin-dashboard",
    pharmacist: "pharmacist",
    medtech:    "/Laboratory",
    warehouse:  "/Warehouse/dashboard",
    registrar:  "/registrar",
  };
  return routes[role.toLowerCase()] ?? "/member-dashboard";
}