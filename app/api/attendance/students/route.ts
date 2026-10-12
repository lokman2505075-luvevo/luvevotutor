import { NextResponse } from 'next/server'
import { authenticateAttendanceTutor } from '../../../../lib/attendanceServer'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET(request: Request) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth

  const [{ data: students, error: studentsError }, { data: invites, error: invitesError }] = await Promise.all([
    admin
      .from('tutor_students')
      .select('id, student_id, display_name, phone, class_level, subject, status, source')
      .eq('tutor_id', user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('tutor_student_invites')
      .select('id, tutor_student_id, expires_at, used_at, created_at')
      .eq('tutor_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (studentsError || invitesError) {
    return NextResponse.json({ error: 'শিক্ষার্থীর তালিকা লোড করা যায়নি' }, { status: 500 })
  }
  return NextResponse.json({ students: students ?? [], invites: invites ?? [] }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function POST(request: Request) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'শিক্ষার্থীর তথ্য সঠিক নয়' }, { status: 400 })
  }
  if (!isObject(payload)) {
    return NextResponse.json({ error: 'শিক্ষার্থীর তথ্য সঠিক নয়' }, { status: 400 })
  }

  const name = typeof payload.displayName === 'string' ? payload.displayName.trim() : ''
  const classLevel = typeof payload.classLevel === 'string' ? payload.classLevel.trim() : ''
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : ''

  if (
    !name || name.length > 100
    || !classLevel || classLevel.length > 60
    || !subject || subject.length > 80
    || phone.length > 32
  ) {
    return NextResponse.json({ error: 'নাম, ক্লাস ও বিষয় সঠিকভাবে লিখুন' }, { status: 400 })
  }

  const { data: student, error } = await admin
    .from('tutor_students')
    .insert({
      tutor_id: user.id,
      display_name: name,
      phone: phone || null,
      class_level: classLevel,
      subject,
      status: 'active',
      source: 'manual',
    })
    .select('id, student_id, display_name, phone, class_level, subject, status, source')
    .single()

  if (error || !student) {
    return NextResponse.json({ error: 'শিক্ষার্থী যোগ করা যায়নি। আবার চেষ্টা করুন।' }, { status: 500 })
  }
  return NextResponse.json({ student }, { status: 201 })
}
