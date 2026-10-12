import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: Request) {
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'সার্ভারের কনফিগারেশন সমস্যা হয়েছে' }, { status: 500 })
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: 'অ্যাকাউন্ট যাচাই করা যায়নি' }, { status: 500 })
  }
  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'শুধু শিক্ষার্থীরা নিজের উপস্থিতি দেখতে পারবেন' }, { status: 403 })
  }

  const { data: records, error: recordsError } = await admin
    .from('attendance_records')
    .select('session_id, status, note, marked_at')
    .eq('student_id', user.id)
    .order('marked_at', { ascending: false })

  if (recordsError) {
    return NextResponse.json({ error: 'উপস্থিতির তথ্য লোড করা যায়নি' }, { status: 500 })
  }

  if (!records?.length) {
    return NextResponse.json({ records: [] }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  }

  const sessionIds = Array.from(new Set(records.map((record) => record.session_id)))
  const { data: sessions, error: sessionsError } = await admin
    .from('attendance_sessions')
    .select('id, tutor_id, session_date, start_time, end_time, topic')
    .in('id', sessionIds)

  if (sessionsError) {
    return NextResponse.json({ error: 'ক্লাসের তথ্য লোড করা যায়নি' }, { status: 500 })
  }

  const tutorIds = Array.from(new Set((sessions ?? []).map((session) => session.tutor_id)))
  const { data: tutors, error: tutorsError } = tutorIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', tutorIds)
    : { data: [], error: null }

  if (tutorsError) {
    return NextResponse.json({ error: 'শিক্ষকের তথ্য লোড করা যায়নি' }, { status: 500 })
  }

  const sessionsById = new Map((sessions ?? []).map((session) => [session.id, session]))
  const tutorsById = new Map((tutors ?? []).map((tutor) => [tutor.id, tutor]))

  return NextResponse.json({
    records: records.flatMap((record) => {
      const session = sessionsById.get(record.session_id)
      if (!session) return []
      return [{
        session_id: record.session_id,
        status: record.status,
        note: record.note,
        marked_at: record.marked_at,
        session: {
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          topic: session.topic,
          tutor_id: session.tutor_id,
          tutor_name: tutorsById.get(session.tutor_id)?.full_name || 'টিউটর',
        },
      }]
    }),
  }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
