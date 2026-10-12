import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { courseId, title } = await req.json()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const { data: course } = await admin
    .from('courses').select('id').eq('id', courseId).eq('teacher_id', user.id).maybeSingle()
  if (!course) return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 403 })

  const lib = process.env.BUNNY_LIBRARY_ID!
  const key = process.env.BUNNY_API_KEY!
  const res = await fetch(`https://video.bunnycdn.com/library/${lib}/videos`, {
    method: 'POST',
    headers: { AccessKey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    const t = await res.text()
    return NextResponse.json({ error: 'Bunny error: ' + t }, { status: 500 })
  }
  const video = await res.json()
  const videoId = video.guid as string

  const { data: lastLesson } = await admin
    .from('course_lessons')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (lastLesson?.order_index ?? -1) + 1

  await admin.from('course_lessons').insert({
    course_id: courseId,
    title,
    bunny_video_id: videoId,
    order_index: nextOrder,
  })

  const expire = Math.floor(Date.now() / 1000) + 3600
  const signature = crypto.createHash('sha256').update(lib + key + expire + videoId).digest('hex')

  return NextResponse.json({
    videoId, libraryId: lib, signature, expire,
    endpoint: 'https://video.bunnycdn.com/tusupload',
  })
}