// utils/auditLogs.ts
import { supabase } from '@/lib/supabase'

export interface LogParams {
  action: string                                   // e.g. 'DISPENSE_MEDICINE'
  module: string                                   // e.g. 'Pharmacy'
  description?: string                             // human-readable detail
  status?: 'success' | 'warning' | 'error'        // default 'success'
  user_name?: string                              // optional override
  user_role?: string                              // optional override
}

/**
 * Writes one row to the `audit_logs` table.
 *
 * If user_name / user_role are not passed, it auto-fills them from the
 * currently logged-in Supabase user (looked up in the `users` table).
 * Safe to call anywhere — it never throws (errors are only logged to console).
 */
export async function logAction(p: LogParams): Promise<void> {
  try {
    let user_name = p.user_name
    let user_role = p.user_role
    let user_id: string | null = null

    // Auto-fill from the logged-in user when not provided
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth?.user
    if (authUser) {
      user_id = authUser.id
      if (!user_name || !user_role) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, role')
          .eq('email', authUser.email ?? '')
          .single()
        if (profile) {
          user_name = user_name || `${profile.first_name} ${profile.last_name}`
          user_role = user_role || profile.role
        }
      }
    }

    await supabase.from('audit_logs').insert({
      user_id,
      user_name: user_name || 'System',
      user_role: user_role || '—',
      action:    p.action,
      module:    p.module,
      description: p.description || '',
      status:    p.status || 'success',
    })
  } catch (err) {
    // Never block the user action because logging failed
    console.error('logAction failed:', err)
  }
}