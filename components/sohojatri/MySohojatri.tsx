'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SOHOJATRI_CATEGORIES } from '../../lib/sohojatri'
import { supabase } from '../../lib/supabaseClient'

type Activity = {
  activity_type: 'created' | 'joined' | 'requested'
  post_id: string
  title: string
  category: string
  post_status: string
  request_status: string | null
  member_role: string | null
}
type Warning = { id: string; message: string; created_at: string }

const activityLabels = {
  created: 'আপনার পোস্ট',
  joined: 'যে দলে যোগ দিয়েছেন',
  requested: 'যোগদানের অনুরোধ',
} as const

function statusLabel(row: Activity) {
  if (row.activity_type === 'requested') {
    if (row.request_status === 'rejected') return 'অনুরোধ প্রত্যাখ্যাত'
    if (row.request_status === 'pending') return 'অনুরোধ অপেক্ষমাণ'
  }
  if (row.post_status === 'approved') return 'প্রকাশিত'
  if (row.post_status === 'pending') return 'অনুমোদনের অপেক্ষায়'
  if (row.post_status === 'rejected') return 'অনুমোদিত হয়নি'
  if (row.post_status === 'closed') return 'বন্ধ'
  if (row.post_status === 'full') return 'দল পূর্ণ'
  return row.post_status
}

export default function MySohojatri({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const [activityResult, warningResult] = await Promise.all([
        supabase.rpc('sohojatri_my_activity'),
        supabase.from('sohojatri_user_warnings').select('id,message,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      if (!alive) return
      if (activityResult.error || warningResult.error) setError('সহযাত্রী কার্যক্রম লোড করা যায়নি')
      else {
        setActivities((activityResult.data ?? []) as Activity[])
        setWarnings((warningResult.data ?? []) as Warning[])
      }
      setLoading(false)
    }
    void load()
    return () => { alive = false }
  }, [userId])

  return <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-blue-950">আমার সহযাত্রী</h2>
        <p className="mt-1 text-sm text-gray-600">আপনার তৈরি পোস্ট, গৃহীত সদস্যতা ও পাঠানো অনুরোধ।</p>
      </div>
      <Link href="/assignment-project" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600">সহযাত্রী খুঁজুন</Link>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {warnings.length > 0 && <aside className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-semibold text-amber-950">অ্যাডমিনের সতর্কবার্তা</h3>
      <ul className="mt-2 space-y-2 text-sm text-amber-900">{warnings.map((warning) => <li key={warning.id}>{warning.message}<span className="ml-2 text-xs text-amber-700">{new Date(warning.created_at).toLocaleDateString('bn-BD')}</span></li>)}</ul>
    </aside>}
    {loading ? <p className="py-6 text-center text-gray-500">লোড হচ্ছে...</p> : activities.length === 0 ? (
      <p className="py-6 text-center text-gray-500">এখনো কোনো সহযাত্রী পোস্ট বা অনুরোধ নেই।</p>
    ) : <div className="mt-4 grid gap-3 md:grid-cols-2">
      {activities.map((item, index) => {
        const category = SOHOJATRI_CATEGORIES.find((entry) => entry.value === item.category)?.label ?? 'অন্যান্য'
        const isPublic = ['approved', 'full'].includes(item.post_status)
        return <article key={`${item.activity_type}-${item.post_id}-${index}`} className="rounded-xl border border-blue-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{activityLabels[item.activity_type]}</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{category}</span>
          </div>
          <h3 className="mt-3 font-semibold text-blue-950">{item.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{statusLabel(item)}</p>
          {item.activity_type === 'requested' && item.request_status === 'pending' && <p className="mt-1 text-xs text-gray-500">আয়োজকের সিদ্ধান্তের অপেক্ষায়</p>}
          {isPublic && <Link href={`/assignment-project/sohojatri/${item.post_id}`} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">পোস্ট দেখুন →</Link>}
        </article>
      })}
    </div>}
  </section>
}
