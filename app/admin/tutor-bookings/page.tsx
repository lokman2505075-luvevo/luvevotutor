'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { formatDate } from '@/components/admin/adminData'

type Booking = {
  id: string
  name: string | null
  phone: string | null
  subject: string | null
  class_level: string | null
  budget: number | string | null
  details: string | null
  status: string
  created_at: string
  tutor_id: string | null
  student_id: string | null
}

type TutorInfo = { id: string; full_name: string | null; tutor_code: string | null }
type Filter = 'all' | 'pending' | 'interested' | 'approved' | 'cancelled'

// Status groups used by the filters and buttons
const PENDING_STATUSES = ['new', 'contacted', 'in_progress']
const CANCELLED_STATUSES = ['cancelled', 'tutor_declined']

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'টিউটরের সাথে যোগাযোগ বাকি' },
  { value: 'interested', label: 'টিউটর আগ্রহী' },
  { value: 'approved', label: 'অ্যাপ্রুভড' },
  { value: 'cancelled', label: 'বাতিল / অরাজি' },
  { value: 'all', label: 'সব' },
]

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  new: { label: 'নতুন', className: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'যোগাযোগ হয়েছে', className: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'চলমান', className: 'bg-purple-100 text-purple-700' },
  completed: { label: 'সম্পন্ন', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'বাতিল', className: 'bg-red-100 text-red-700' },
  approved: { label: 'অ্যাপ্রুভড', className: 'bg-emerald-100 text-emerald-700' },
  tutor_interested: { label: 'টিউটর আগ্রহী', className: 'bg-sky-100 text-sky-700' },
  tutor_declined: { label: 'টিউটর রাজি নয়', className: 'bg-orange-100 text-orange-700' },
}

export default function TutorBookingsPage() {
  const [rows, setRows] = useState<Booking[]>([])
  const [tutors, setTutors] = useState<Record<string, TutorInfo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [filter, setFilter] = useState<Filter>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('live_tuition_bookings')
      .select('id, name, phone, subject, class_level, budget, details, status, created_at, tutor_id, student_id')
      .not('tutor_id', 'is', null)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError('রিকোয়েস্ট লোড করা যায়নি। আপনি অ্যাডমিন হিসেবে লগইন করেছেন কিনা দেখুন।')
      setRows([])
      setLoading(false)
      return
    }

    const bookings = (data ?? []) as Booking[]
    setRows(bookings)

    const ids = Array.from(new Set(bookings.map((item) => item.tutor_id).filter((id): id is string => Boolean(id))))
    if (ids.length > 0) {
      const { data: tutorData } = await supabase.from('profiles').select('id, full_name, tutor_code').in('id', ids)
      const map: Record<string, TutorInfo> = {}
      ;((tutorData ?? []) as TutorInfo[]).forEach((tutor) => { map[tutor.id] = tutor })
      setTutors(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function changeStatus(id: string, status: string) {
    setBusyId(id)
    setError('')
    const { error: updateError } = await supabase
      .from('live_tuition_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) setError('স্ট্যাটাস বদলানো যায়নি। আবার চেষ্টা করুন।')
    else setRows((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    setBusyId('')
  }

  const visible = rows.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'approved') return item.status === 'approved'
    if (filter === 'interested') return item.status === 'tutor_interested'
    if (filter === 'cancelled') return CANCELLED_STATUSES.includes(item.status)
    return PENDING_STATUSES.includes(item.status)
  })

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">লুভেভো টিউটর</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">টিউটর বুকিং অনুমোদন</h1>
        <p className="mt-2 text-gray-600">
          আগে টিউটরের সাথে যোগাযোগ করে জেনে নিন তিনি পড়াতে আগ্রহী কিনা। আগ্রহী হলে টিউশনটি বুঝিয়ে দিন, তারপর অ্যাপ্রুভ করুন। অ্যাপ্রুভ করলে অভিভাবক টিউটরের ফোন নম্বর দেখতে পাবেন।
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item.value ? 'bg-primary text-white' : 'bg-white text-gray-600 shadow-sm hover:bg-blue-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-gray-500">লোড হচ্ছে...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl bg-white py-12 text-center text-gray-500 shadow-sm">এই ফিল্টারে কোনো রিকোয়েস্ট নেই</p>
      ) : (
        <div className="grid gap-4">
          {visible.map((item) => {
            const tutor = item.tutor_id ? tutors[item.tutor_id] : undefined
            const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.new
            const hasAccount = Boolean(item.student_id)
            const busy = busyId === item.id
            const isPending = PENDING_STATUSES.includes(item.status)
            return (
              <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">টিউটর</p>
                    <h2 className="text-lg font-bold text-blue-950">
                      {tutor?.full_name || 'অজানা টিউটর'}
                      {tutor?.tutor_code ? <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{tutor.tutor_code}</span> : null}
                    </h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  <p><span className="text-gray-500">অভিভাবক/স্টুডেন্ট:</span> {item.name || '—'}</p>
                  <p><span className="text-gray-500">ফোন:</span> {item.phone || '—'}</p>
                  <p><span className="text-gray-500">বিষয়:</span> {item.subject || '—'}</p>
                  <p><span className="text-gray-500">ক্লাস:</span> {item.class_level || '—'}</p>
                  <p><span className="text-gray-500">বাজেট:</span> {item.budget ?? '—'}</p>
                  <p><span className="text-gray-500">তারিখ:</span> {formatDate(item.created_at)}</p>
                </div>

                {item.details && <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm leading-7 text-gray-600">{item.details}</p>}

                {!hasAccount && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    এই রিকোয়েস্ট লগইন ছাড়া পাঠানো হয়েছে। অ্যাপ্রুভ করলেও অভিভাবক ফোন নম্বর আনলক দেখতে পাবেন না। আগে অভিভাবকের সাথে যোগাযোগ করে তাঁকে লগইন করে নতুন রিকোয়েস্ট পাঠাতে বলুন।
                  </p>
                )}

                {item.status === 'tutor_declined' && (
                  <p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm font-semibold text-orange-800">
                    টিউটর রাজি নন। অভিভাবককে জানিয়ে অন্য টিউটর বেছে নিতে বলুন।
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Step 1: after calling the tutor */}
                  {isPending && (
                    <>
                      <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'tutor_interested')} className="min-h-10 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-50">
                        {busy ? 'অপেক্ষা করুন...' : 'টিউটর আগ্রহী'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'tutor_declined')} className="min-h-10 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-800 transition hover:bg-orange-100 disabled:opacity-50">
                        টিউটর রাজি নয়
                      </button>
                    </>
                  )}

                  {/* Step 2: only after tutor is interested and tuition has been explained */}
                  {item.status === 'tutor_interested' && (
                    <button type="button" disabled={busy || !hasAccount} onClick={() => void changeStatus(item.id, 'approved')} className="min-h-10 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {busy ? 'অপেক্ষা করুন...' : 'অ্যাপ্রুভ করুন'}
                    </button>
                  )}

                  {item.status === 'approved' && (
                    <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'tutor_interested')} className="min-h-10 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50">
                      অ্যাপ্রুভ প্রত্যাহার করুন
                    </button>
                  )}

                  {/* {!CANCELLED_STATUSES.includes(item.status) && (
                    <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'cancelled')} className="min-h-10 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                      বাতিল করুন
                    </button>
                  )} */}
                  {CANCELLED_STATUSES.includes(item.status) && (
                    <>
                      <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'tutor_interested')} className="min-h-10 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-50">
                        টিউটর আগ্রহী (ফোনে জানিয়েছেন)
                      </button>
                      <button type="button" disabled={busy} onClick={() => void changeStatus(item.id, 'new')} className="min-h-10 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50">
                        আবার চালু করুন
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}