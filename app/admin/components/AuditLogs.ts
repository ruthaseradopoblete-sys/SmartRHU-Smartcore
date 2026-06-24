import { supabase } from '@/lib/supabase'

type AuditStatus = 'success' | 'warning' | 'error'

type LogActionParams = {
  user_id?: string | null
  user_name?: string | null
  user_role?: string | null
  action: string
  module: string
  description?: string | null
  status?: AuditStatus
  ip_address?: string | null
}

function normalizeRole(role?: string | null) {
  const r = (role || '').trim().toLowerCase()
  if (r === 'doctor') return 'Doctor'
  if (r === 'nurse') return 'Nurse'
  if (r === 'registrar') return 'Registrar'
  if (r === 'pharmacist' || r === 'pharmacy') return 'Pharmacist'
  if (r === 'warehouse' || r === 'warehouse staff') return 'Warehouse Staff'
  if (r === 'medtech' || r === 'medical technologist' || r === 'laboratory') return 'Medical Technologist'
  if (r === 'admin') return 'Admin'
  return role || 'System'
}

function getStoredUser() {
  if (typeof window === 'undefined') return null
  const keys = ['smartrhu_user', 'smart_rhu_user', 'user', 'auth_user']
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try { return JSON.parse(raw) } catch { /* ignore */ }
  }
  return null
}

export async function logAction(params: LogActionParams) {
  try {
    const stored = getStoredUser()
    const { data: { user } } = await supabase.auth.getUser()

    const userId = params.user_id ?? user?.id ?? stored?.user_id ?? stored?.id ?? null
    const userName = params.user_name ?? stored?.name ?? stored?.full_name ?? stored?.username ?? user?.email ?? 'System'
    const userRole = normalizeRole(params.user_role ?? stored?.role ?? null)

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action: params.action,
      module: params.module,
      description: params.description ?? null,
      status: params.status ?? 'success',
      ip_address: params.ip_address ?? null,
      created_at: new Date().toISOString(),
    })

    if (error) console.warn('[audit log failed]', error.message)
  } catch (err) {
    console.warn('[audit log failed]', err)
  }
}

export async function logLogin(user_name: string, user_role: string, user_id?: string | null) {
  return logAction({ user_id, user_name, user_role, action: 'LOGIN', module: 'Auth', description: `${normalizeRole(user_role)} logged in` })
}

export async function logLogout(user_name?: string | null, user_role?: string | null, user_id?: string | null) {
  return logAction({ user_id, user_name, user_role, action: 'LOGOUT', module: 'Auth', description: `${normalizeRole(user_role)} logged out` })
}
