import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type UserRole =
  | "doctor"
  | "pharmacist"
  | "medtech"
  | "warehouse"
  | "registrar"
  | "admin";

export interface DBUser {
  user_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: string;
  is_first_login: boolean;
}

export function getRouteForRole(role: string): string {
  const routes: Record<string, string> = {
    doctor:     "/doctor",
    admin:      "/admin-dashboard",
    pharmacist: "/pharmacist",
    medtech:    "/Laboratory",
    warehouse:  "/warehouse/dashboard",
    registrar:  "/registrar",
  };
  return routes[role.toLowerCase()] ?? "/member-dashboard";
}
