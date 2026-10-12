import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export type NeedType = 'free_tuition' | 'books_materials'

function text(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'string') throw new Error(`${label} সঠিকভাবে লিখুন`)
  const result = value.trim()
  if (result.length < min || result.length > max) throw new Error(`${label} ${min} থেকে ${max} অক্ষরের মধ্যে লিখুন`)
  return result
}

function stringList(value: unknown, label: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} এর তালিকা সঠিক নয়`)
  const values = value.map((item) => text(item, label, 1, maxLength))
  if (new Set(values.map((item) => item.toLocaleLowerCase())).size !== values.length) {
    throw new Error(`${label} এর তালিকায় একই বিষয় একাধিকবার আছে`)
  }
  return values
}

function needType(value: unknown): NeedType {
  if (value !== 'free_tuition' && value !== 'books_materials') throw new Error('সহায়তার ধরন নির্বাচন করুন')
  return value
}

export function validateSupportRequest(value: Record<string, unknown>) {
  if (value.consent !== true) throw new Error('তথ্য ব্যবহারে সম্মতি দিতে হবে')
  const subjects = stringList(value.subjects, 'বিষয়', 20, 80)
  if (!subjects.length) throw new Error('কমপক্ষে একটি বিষয় লিখুন')
  return {
    student_name: text(value.student_name, 'শিক্ষার্থীর নাম', 2, 120),
    student_class: text(value.student_class, 'শ্রেণি', 1, 80),
    district: text(value.district, 'জেলা', 1, 100),
    upazila: text(value.upazila, 'উপজেলা', 1, 100),
    need_type: needType(value.need_type),
    subjects,
    description: text(value.description, 'সহায়তার বিবরণ', 10, 2000),
    guardian_contact: text(value.guardian_contact, 'অভিভাবকের যোগাযোগ নম্বর', 5, 100),
  }
}

export function validateVolunteerOffer(value: Record<string, unknown>) {
  const subjects = stringList(value.subjects, 'বিষয়', 20, 80)
  return {
    offer_type: needType(value.offer_type),
    subjects,
    districts: stringList(value.districts, 'জেলা', 64, 100),
    available_days: text(value.available_days, 'সময়সূচি', 1, 500),
    description: text(value.description, 'সহায়তার বিবরণ', 10, 2000),
  }
}

export async function submitEducationSupport(request: Request, kind: 'request' | 'volunteer') {
  const accessToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return NextResponse.json({ error: 'অনুরোধ পাঠাতে লগইন করুন' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'ফর্মের তথ্য সঠিক নয়' }, { status: 400 })
  }

  let payload
  try {
    payload = kind === 'request' ? validateSupportRequest(body) : validateVolunteerOffer(body)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ফর্মের তথ্য সঠিক নয়' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    console.error('[Education Support] Supabase environment is incomplete')
    return NextResponse.json({ error: 'সেবা সাময়িকভাবে অনুপলভ্য' }, { status: 500 })
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) return NextResponse.json({ error: 'আপনার লগইন যাচাই করা যায়নি' }, { status: 401 })

  const ownerColumn = kind === 'request' ? 'requester_user_id' : 'volunteer_user_id'
  const { error } = await supabase.from(kind === 'request' ? 'support_requests' : 'volunteer_offers')
    .insert({ ...payload, [ownerColumn]: user.id })
  if (error) {
    console.error(`[Education Support] ${kind} submission failed:`, error.message)
    return NextResponse.json({ error: 'তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
