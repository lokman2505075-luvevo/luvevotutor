import { NextResponse } from 'next/server'
import { authenticateAttendanceTutor } from '../../../lib/attendanceServer'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused'])

type AttendancePayload = {
  sessionId?: unknown
  tuitionIds?: unknown
  sessionDate?: unknown
  startTime?: unknown
  endTime?: unknown
  topic?: unknown
  tutorStudentIds?: unknown
  records?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export async function GET(request: Request) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth

  const [
    { data: bookings, error: bookingsError },
    { data: sessions, error: sessionsError },
    { data: tutorStudents, error: studentsError },
    { data: invites, error: invitesError },
  ] = await Promise.all([
    admin
      .from('live_tuition_bookings')
      .select('id, student_id, name, subject, class_level')
      .eq('tutor_id', user.id)
      .in('status', ['approved', 'completed'])
      .not('student_id', 'is', null)
      .order('created_at', { ascending: false }),
    admin
      .from('attendance_sessions')
      .select('id, batch_or_tuition_id, session_date, start_time, end_time, topic, created_at')
      .eq('tutor_id', user.id)
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false }),
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

  if (bookingsError || sessionsError || studentsError || invitesError) {
    return NextResponse.json({ error: 'উপস্থিতির তথ্য লোড করা যায়নি' }, { status: 500 })
  }

  const sessionRows = sessions ?? []
  const sessionIds = sessionRows.map((session) => session.id)
  if (sessionIds.length === 0) {
    return NextResponse.json({
      bookings: bookings ?? [],
      tutorStudents: tutorStudents ?? [],
      invites: invites ?? [],
      sessions: [],
    })
  }

  const [
    { data: sessionTuitions, error: tuitionError },
    { data: records, error: recordsError },
  ] = await Promise.all([
    admin
      .from('attendance_session_tuitions')
      .select('session_id, tuition_id')
      .in('session_id', sessionIds),
    admin
      .from('attendance_records')
      .select('session_id, student_id, tutor_student_id, status, note, marked_at')
      .in('session_id', sessionIds),
  ])

  if (tuitionError || recordsError) {
    return NextResponse.json({ error: 'সেশনের উপস্থিতি লোড করা যায়নি' }, { status: 500 })
  }

  return NextResponse.json({
    bookings: bookings ?? [],
    tutorStudents: tutorStudents ?? [],
    invites: invites ?? [],
    sessions: sessionRows.map((session) => ({
      ...session,
      tuitionIds: (sessionTuitions ?? [])
        .filter((item) => item.session_id === session.id)
        .map((item) => item.tuition_id),
      records: (records ?? []).filter((item) => item.session_id === session.id),
    })),
  })
}

async function saveSession(request: Request, update: boolean) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth

  let payload: AttendancePayload
  try {
    payload = await request.json() as AttendancePayload
  } catch {
    return NextResponse.json({ error: 'অনুরোধটি সঠিক নয়' }, { status: 400 })
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'অনুরোধটি সঠিক নয়' }, { status: 400 })
  }

  const {
    sessionId,
    tuitionIds,
    sessionDate,
    startTime,
    endTime,
    topic,
    tutorStudentIds,
    records,
  } = payload

  if (
    (update && (typeof sessionId !== 'string' || !UUID_PATTERN.test(sessionId)))
    || !Array.isArray(tuitionIds)
    || tuitionIds.length > 50
    || tuitionIds.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))
    || new Set(tuitionIds).size !== tuitionIds.length
    || !Array.isArray(tutorStudentIds)
    || tutorStudentIds.length > 200
    || tutorStudentIds.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))
    || new Set(tutorStudentIds).size !== tutorStudentIds.length
    || (tuitionIds.length === 0 && tutorStudentIds.length === 0)
    || typeof sessionDate !== 'string'
    || !isDate(sessionDate)
    || !isTime(startTime)
    || (endTime !== null && endTime !== '' && !isTime(endTime))
    || typeof topic !== 'string'
    || topic.trim().length > 300
    || !Array.isArray(records)
  ) {
    return NextResponse.json({ error: 'সেশনের তথ্য সঠিকভাবে পূরণ করুন' }, { status: 400 })
  }

  if (endTime && endTime <= startTime) {
    return NextResponse.json({ error: 'শেষের সময় শুরুর সময়ের পরে হতে হবে' }, { status: 400 })
  }

  if (update) {
    const { data: existingSession, error: existingError } = await admin
      .from('attendance_sessions')
      .select('id')
      .eq('id', sessionId as string)
      .eq('tutor_id', user.id)
      .maybeSingle()
    if (existingError) {
      return NextResponse.json({ error: 'সেশন যাচাই করা যায়নি' }, { status: 500 })
    }
    if (!existingSession) {
      return NextResponse.json({ error: 'সেশনটি পাওয়া যায়নি' }, { status: 404 })
    }
  }

  const [{ data: bookings, error: bookingsError }, { data: manualStudents, error: studentsError }] = await Promise.all([
    tuitionIds.length
      ? admin
        .from('live_tuition_bookings')
        .select('id, student_id')
        .eq('tutor_id', user.id)
        .in('id', tuitionIds as string[])
        .in('status', ['approved', 'completed'])
        .not('student_id', 'is', null)
      : Promise.resolve({ data: [], error: null }),
    tutorStudentIds.length
      ? admin
        .from('tutor_students')
        .select('id')
        .eq('tutor_id', user.id)
        .eq('status', 'active')
        .in('id', tutorStudentIds as string[])
      : Promise.resolve({ data: [], error: null }),
  ])

  if (bookingsError || studentsError) {
    return NextResponse.json({ error: 'শিক্ষার্থীর টিউশন যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!bookings || bookings.length !== tuitionIds.length) {
    return NextResponse.json({ error: 'নির্বাচিত শিক্ষার্থীর টিউশন আপনার নয় বা অনুমোদিত নয়' }, { status: 403 })
  }
  if (!manualStudents || manualStudents.length !== tutorStudentIds.length) {
    return NextResponse.json({ error: 'নির্বাচিত শিক্ষার্থী আপনার তালিকায় নেই বা নিষ্ক্রিয়' }, { status: 403 })
  }

  const studentIds = bookings.map((booking) => booking.student_id as string)
  if (new Set(studentIds).size !== studentIds.length) {
    return NextResponse.json({ error: 'একজন শিক্ষার্থীকে একবারই নির্বাচন করুন' }, { status: 400 })
  }

  const recordStudentIds: string[] = []
  const recordTutorStudentIds: string[] = []
  for (const item of records) {
    if (
      !isRecord(item)
      || typeof item.status !== 'string'
      || !ATTENDANCE_STATUSES.has(item.status)
      || (item.note !== null && item.note !== undefined && (
        typeof item.note !== 'string' || item.note.length > 500
      ))
      || (
        item.studentId !== undefined
        && item.studentId !== null
        && (typeof item.studentId !== 'string' || !UUID_PATTERN.test(item.studentId))
      )
      || (
        item.tutorStudentId !== undefined
        && item.tutorStudentId !== null
        && (typeof item.tutorStudentId !== 'string' || !UUID_PATTERN.test(item.tutorStudentId))
      )
      || ((item.studentId == null) === (item.tutorStudentId == null))
    ) {
      return NextResponse.json({ error: 'উপস্থিতির তথ্য সঠিক নয়' }, { status: 400 })
    }
    if (typeof item.studentId === 'string') recordStudentIds.push(item.studentId)
    if (typeof item.tutorStudentId === 'string') recordTutorStudentIds.push(item.tutorStudentId)
  }

  if (
    records.length !== studentIds.length + tutorStudentIds.length
    || new Set(recordStudentIds).size !== studentIds.length
    || studentIds.some((id) => !recordStudentIds.includes(id))
    || new Set(recordTutorStudentIds).size !== tutorStudentIds.length
    || (tutorStudentIds as string[]).some((id) => !recordTutorStudentIds.includes(id))
  ) {
    return NextResponse.json({ error: 'শুধু নির্বাচিত শিক্ষার্থীর উপস্থিতি নেওয়া যাবে' }, { status: 403 })
  }

  const { data: savedSessionId, error: saveError } = await admin.rpc(
    'save_tutor_attendance_session',
    {
      p_tutor_id: user.id,
      p_session_id: update ? sessionId : null,
      p_session_date: sessionDate,
      p_start_time: startTime,
      p_end_time: endTime || null,
      p_topic: topic.trim(),
      p_tuition_ids: tuitionIds,
      p_tutor_student_ids: tutorStudentIds,
      p_records: records.map((item) => {
        const attendance = item as {
          studentId?: string | null
          tutorStudentId?: string | null
          status: string
          note?: string | null
        }
        return {
          student_id: attendance.studentId ?? null,
          tutor_student_id: attendance.tutorStudentId ?? null,
          status: attendance.status,
          note: attendance.note?.trim() || null,
        }
      }),
    },
  )

  if (saveError || !savedSessionId) {
    return NextResponse.json({ error: 'উপস্থিতি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: savedSessionId })
}

export async function POST(request: Request) {
  return saveSession(request, false)
}

export async function PATCH(request: Request) {
  return saveSession(request, true)
}
