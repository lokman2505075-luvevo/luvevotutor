import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request, { params }: { params: { lessonId: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'সার্ভারের কনফিগারেশন সমস্যা হয়েছে' }, { status: 500 })
  }

  const authorization = req.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const { data: lesson, error: lessonError } = await admin
    .from('course_lessons')
    .select('id, course_id, bunny_video_id')
    .eq('id', params.lessonId)
    .maybeSingle()
  if (lessonError) {
    return NextResponse.json({ error: 'লেসনের তথ্য লোড করা যায়নি' }, { status: 500 })
  }
  if (!lesson) return NextResponse.json({ error: 'লেসন খুঁজে পাওয়া যায়নি' }, { status: 404 })

  const [{ data: purchase, error: purchaseError }, { data: course, error: courseError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin.from('purchases')
        .select('id')
        .eq('course_id', lesson.course_id)
        .eq('student_id', user.id)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle(),
      admin.from('courses')
        .select('teacher_id')
        .eq('id', lesson.course_id)
        .maybeSingle(),
      admin.from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
    ])

  if (purchaseError || courseError || profileError) {
    return NextResponse.json({ error: 'কোর্সের অনুমতি যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!course) return NextResponse.json({ error: 'কোর্স খুঁজে পাওয়া যায়নি' }, { status: 404 })

  const allowed = Boolean(purchase)
    || course.teacher_id === user.id
    || profile?.role === 'admin'
  if (!allowed) return NextResponse.json({ error: 'এই কোর্সটি দেখার অনুমতি নেই' }, { status: 403 })

  const tokenAuthKey = process.env.BUNNY_TOKEN_AUTH_KEY
  const libraryId = process.env.BUNNY_LIBRARY_ID
  if (!tokenAuthKey || !libraryId || !lesson.bunny_video_id) {
    return NextResponse.json({ error: 'ভিডিওর কনফিগারেশন পাওয়া যায়নি' }, { status: 500 })
  }

  const expires = Math.floor(Date.now() / 1000) + 4 * 3600
  const signature = crypto.createHash('sha256')
    .update(tokenAuthKey + lesson.bunny_video_id + expires)
    .digest('hex')

  return NextResponse.json({
    url: `https://iframe.mediadelivery.net/embed/${libraryId}/${lesson.bunny_video_id}?token=${signature}&expires=${expires}`,
  })
}
