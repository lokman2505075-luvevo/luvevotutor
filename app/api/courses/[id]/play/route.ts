import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const [{ data: purchase }, { data: course }, { data: profile }] = await Promise.all([
    admin.from('purchases').select('id').eq('course_id', params.id)
      .eq('student_id', user.id).eq('status', 'paid').maybeSingle(),
    admin.from('courses').select('teacher_id').eq('id', params.id).single(),
    admin.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const allowed = purchase || course?.teacher_id === user.id || profile?.role === 'admin'
  if (!allowed) return NextResponse.json({ error: 'কোর্সটি কেনা হয়নি' }, { status: 403 })

  const { data: v } = await admin.from('course_videos')
    .select('bunny_video_id').eq('course_id', params.id).single()
  if (!v) return NextResponse.json({ error: 'ভিডিও এখনো আপলোড হয়নি' }, { status: 404 })

  const expires = Math.floor(Date.now() / 1000) + 4 * 3600
  const sig = crypto.createHash('sha256')
    .update(process.env.BUNNY_TOKEN_AUTH_KEY! + v.bunny_video_id + expires)
    .digest('hex')

  return NextResponse.json({
    url: `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_LIBRARY_ID}/${v.bunny_video_id}?token=${sig}&expires=${expires}`,
  })
}