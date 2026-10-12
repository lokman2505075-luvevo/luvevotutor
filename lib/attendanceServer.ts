import { NextResponse } from 'next/server'
import { createClient, User } from '@supabase/supabase-js'

export function createAttendanceAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function authenticateAttendanceTutor(request: Request): Promise<
  | { admin: NonNullable<ReturnType<typeof createAttendanceAdminClient>>; user: User }
  | { response: NextResponse }
> {
  const admin = createAttendanceAdminClient()
  if (!admin) {
    return { response: NextResponse.json({ error: 'সার্ভারের কনফিগারেশন সমস্যা হয়েছে' }, { status: 500 }) }
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { response: NextResponse.json({ error: 'লগইন করুন' }, { status: 401 }) }
  }

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'লগইন করুন' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: 'অ্যাকাউন্ট যাচাই করা যায়নি' }, { status: 500 }) }
  }
  if (profile?.role !== 'tutor' || profile.status !== 'approved') {
    return { response: NextResponse.json({ error: 'অনুমোদিত টিউটরের জন্য এই সুবিধা' }, { status: 403 }) }
  }

  return { admin, user }
}
