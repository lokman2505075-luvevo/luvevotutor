import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request, { params }: { params: { id: string } }) {
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

  const [{ data: course, error: courseError }, { data: purchase, error: purchaseError }, { data: profile, error: profileError }] =
    await Promise.all([
      admin.from('courses')
        .select('id, teacher_id, title, teacher_name, description')
        .eq('id', params.id)
        .maybeSingle(),
      admin.from('purchases')
        .select('id')
        .eq('course_id', params.id)
        .eq('student_id', user.id)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle(),
      admin.from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
    ])

  if (courseError || purchaseError || profileError) {
    return NextResponse.json({ error: 'কোর্সের অনুমতি যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!course) return NextResponse.json({ error: 'কোর্স খুঁজে পাওয়া যায়নি' }, { status: 404 })

  const allowed = Boolean(purchase)
    || course.teacher_id === user.id
    || profile?.role === 'admin'
  if (!allowed) return NextResponse.json({ error: 'এই কোর্সটি দেখার অনুমতি নেই' }, { status: 403 })

  const { data: lessons, error: lessonsError } = await admin
    .from('course_lessons')
    .select('id, title, order_index')
    .eq('course_id', params.id)
    .order('order_index', { ascending: true })

  if (lessonsError) {
    return NextResponse.json({ error: 'লেসন তালিকা লোড করা যায়নি' }, { status: 500 })
  }

  return NextResponse.json({
    course: {
      title: course.title,
      teacher_name: course.teacher_name,
      description: course.description,
    },
    lessons,
  })
}
