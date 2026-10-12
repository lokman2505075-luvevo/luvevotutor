import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { authenticateAttendanceTutor } from '../../../../../../lib/attendanceServer'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: { studentId: string }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth
  const { studentId } = context.params

  if (!UUID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: 'শিক্ষার্থীকে খুঁজে পাওয়া যায়নি' }, { status: 404 })
  }

  const { data: student, error: studentError } = await admin
    .from('tutor_students')
    .select('id')
    .eq('id', studentId)
    .eq('tutor_id', user.id)
    .eq('status', 'active')
    .is('student_id', null)
    .maybeSingle()

  if (studentError) {
    return NextResponse.json({ error: 'শিক্ষার্থীর তথ্য যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!student) {
    return NextResponse.json({ error: 'এই শিক্ষার্থীর জন্য আমন্ত্রণ তৈরি করা যাবে না' }, { status: 404 })
  }

  const now = new Date()
  const { data: activeInvite, error: activeInviteError } = await admin
    .from('tutor_student_invites')
    .select('id')
    .eq('tutor_id', user.id)
    .eq('tutor_student_id', studentId)
    .is('used_at', null)
    .gt('expires_at', now.toISOString())
    .limit(1)
    .maybeSingle()

  if (activeInviteError) {
    return NextResponse.json({ error: 'বর্তমান আমন্ত্রণ যাচাই করা যায়নি' }, { status: 500 })
  }
  if (activeInvite) {
    return NextResponse.json({ error: 'নতুন লিংক তৈরির আগে বর্তমান লিংকটি প্রত্যাহার করুন' }, { status: 409 })
  }

  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count: recentInviteCount, error: rateLimitError } = await admin
    .from('tutor_student_invites')
    .select('id', { count: 'exact', head: true })
    .eq('tutor_id', user.id)
    .gte('created_at', since)

  if (rateLimitError) {
    return NextResponse.json({ error: 'আমন্ত্রণের সীমা যাচাই করা যায়নি' }, { status: 500 })
  }
  if ((recentInviteCount ?? 0) >= 20) {
    return NextResponse.json({ error: 'এক ঘণ্টায় সর্বোচ্চ ২০টি আমন্ত্রণ তৈরি করা যাবে' }, { status: 429 })
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: invite, error: inviteError } = await admin
    .from('tutor_student_invites')
    .insert({
      tutor_id: user.id,
      tutor_student_id: studentId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, expires_at')
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'আমন্ত্রণ লিংক তৈরি করা যায়নি' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const inviteUrl = new URL(`/join-tutor/${token}`, siteUrl).toString()
  return NextResponse.json({ invite: { id: invite.id, expiresAt: invite.expires_at, url: inviteUrl } }, {
    status: 201,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateAttendanceTutor(request)
  if ('response' in auth) return auth.response
  const { admin, user } = auth
  const { studentId } = context.params

  if (!UUID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: 'শিক্ষার্থীকে খুঁজে পাওয়া যায়নি' }, { status: 404 })
  }

  const { error } = await admin
    .from('tutor_student_invites')
    .delete()
    .eq('tutor_id', user.id)
    .eq('tutor_student_id', studentId)
    .is('used_at', null)

  if (error) {
    return NextResponse.json({ error: 'আমন্ত্রণ প্রত্যাহার করা যায়নি' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
