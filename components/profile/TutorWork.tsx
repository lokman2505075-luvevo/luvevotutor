"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { Card, Empty, Pill, taka } from './ui'
import TutorBookingRequests from '../tutors/TutorBookingRequests'
import TutorAttendanceManager from '../attendance/TutorAttendanceManager'

const APP_STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'red' | 'gray' }> = {
  pending: { label: 'অপেক্ষমাণ', tone: 'amber' },
  accepted: { label: 'গৃহীত', tone: 'green' },
  completed: { label: 'গৃহীত', tone: 'green' },
  rejected: { label: 'বাতিল', tone: 'red' },
}

function waLink(n: string) {
  const d = n.replace(/\D/g, '')
  return 'https://wa.me/' + (d.startsWith('88') ? d : d.startsWith('0') ? '88' + d : '88' + d)
}

const one = (x: any) => (Array.isArray(x) ? x[0] : x)

export default function TutorWork({ userId, approved }: { userId: string; approved: boolean }) {
  const [apps, setApps] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [sales, setSales] = useState<Record<string, any>>({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [a, c, co, s] = await Promise.all([
        supabase
          .from('job_applications')
          .select('id,status,created_at,job_posts(title,class_level,area,salary)')
          .eq('tutor_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('accepted_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('id,title,price').eq('teacher_id', userId),
        supabase.from('tutor_course_sales').select('*'),
      ])
      if (!alive) return
      setApps(a.data ?? [])
      setContracts(c.data ?? [])
      setCourses(co.data ?? [])
      setSales(Object.fromEntries((s.data ?? []).map((r: any) => [r.course_id, r])))
    })()
    return () => {
      alive = false
    }
  }, [userId])

  const totalEarned = Object.values(sales).reduce((sum: number, r: any) => sum + Number(r.tutor_share ?? 0), 0)
  const totalSold = Object.values(sales).reduce((sum: number, r: any) => sum + Number(r.sales_count ?? 0), 0)

  return (
    <>
      {/* My Applications */}
      <Card title="আমার আবেদন" hint="যে টিউশনে আবেদন করেছেন">
        {apps.length === 0 ? (
          <Empty>
            এখনো কোনো আবেদন নেই। <Link href="/jobs" className="font-semibold text-primary">জব বোর্ড দেখুন</Link>
          </Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {apps.map((a) => {
              const p = one(a.job_posts)
              const st = APP_STATUS[a.status] ?? { label: a.status, tone: 'gray' as const }
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{p?.title ?? 'টিউশন'}</p>
                    <p className="text-sm text-gray-500">
                      {[p?.class_level, p?.area, p?.salary ? taka(p.salary) : null].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Accepted tuition — guardian contract + direct tutor booking requests */}
      <Card
        title="গৃহীত টিউশন ও অভিভাবকের তথ্য"
        hint="আবেদন গৃহীত হলে অভিভাবকের যোগাযোগের তথ্য এখানে নিজে থেকেই আসবে।"
      >
        {/* Direct requests: guardian phone hidden until tutor taps "interested" */}
        <TutorBookingRequests />

        {contracts.length === 0 ? (
          <Empty>জব বোর্ডের কোনো আবেদন এখনো গৃহীত হয়নি।</Empty>
        ) : (
          <div className="space-y-4">
            {contracts.map((c) => (
              <article key={c.application_id} className="rounded-xl bg-sky-50/60 p-4 ring-1 ring-sky-100">
                <h3 className="font-bold text-primary">{c.title}</h3>
                <p className="text-sm text-gray-600">
                  {[c.class_level, c.area, c.salary ? taka(c.salary) + '/মাস' : null].filter(Boolean).join(', ')}
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">অভিভাবক</dt>
                    <dd className="font-medium">{c.guardian_name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">ঠিকানা</dt>
                    <dd className="font-medium">{c.address || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">ফোন</dt>
                    <dd className="font-medium">{c.guardian_phone}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">WhatsApp</dt>
                    <dd className="font-medium">{c.guardian_whatsapp || c.guardian_phone}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${c.guardian_phone}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                    কল করুন
                  </a>
                  <a
                    href={waLink(c.guardian_whatsapp || c.guardian_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                </div>
              </article>
            ))}

            <details className="rounded-xl border border-gray-200 p-4">
              <summary className="cursor-pointer font-semibold text-primary">অভিভাবকের সাথে কথা বলার নিয়ম</summary>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
                <li>আবেদন গৃহীত হওয়ার ২৪ ঘণ্টার মধ্যে প্রথম যোগাযোগ করুন।</li>
                <li>শুরুতে নিজের পরিচয় দিন: নাম, বিশ্ববিদ্যালয় এবং Luvevo Tutor থেকে আপনার আবেদন গৃহীত হয়েছে।</li>
                <li>পড়ানোর দিন, সময়, বেতন ও শিক্ষার্থীর বর্তমান অবস্থা জেনে নিন।</li>
                <li>একটি ডেমো ক্লাসের সময় ঠিক করুন।</li>
                <li>ভদ্র ভাষা ব্যবহার করুন এবং শুধু টিউশন সংক্রান্ত বিষয়ে কথা বলুন।</li>
                <li>প্রথম মাসের বেতন পেলে প্ল্যাটফর্ম ফি পরিশোধ করুন।</li>
              </ol>
              <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <span className="font-semibold">কলের নমুনা: </span>
                “আসসালামু আলাইকুম, আমি [আপনার নাম], [বিশ্ববিদ্যালয়] থেকে পড়ছি। Luvevo Tutor-এর মাধ্যমে আপনার
                [ক্লাস]-এর টিউশনে আমার আবেদন গৃহীত হয়েছে। কবে একটু কথা বলা যাবে?”
              </p>
            </details>
          </div>
        )}
      </Card>

      <TutorAttendanceManager />

      {/* My courses + earnings */}
      <Card
        title="আমার কোর্স ও আয়"
        hint="প্রতিটি কোর্স বিক্রির ৫০% আপনার।"
        action={
          approved ? (
            <Link href="/tutor-hub/new-course" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
              + নতুন কোর্স যোগ করুন
            </Link>
          ) : undefined
        }
      >
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
            <p className="text-sm text-gray-600">মোট আয় (আপনার ৫০%)</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{taka(totalEarned)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-sm text-gray-600">মোট বিক্রি</p>
            <p className="mt-1 text-2xl font-bold">{totalSold.toLocaleString('bn-BD')} টি</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <Empty>এখনো কোনো কোর্স নেই।</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {courses.map((c) => {
              const s = sales[c.id]
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-500">
                      দাম {taka(c.price)}, প্রতি বিক্রিতে আপনি পান {taka(Number(c.price) / 2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700">{taka(s?.tutor_share)}</p>
                    <p className="text-sm text-gray-500">{Number(s?.sales_count ?? 0).toLocaleString('bn-BD')} টি বিক্রি</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}