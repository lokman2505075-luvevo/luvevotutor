'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Request = {
  id: string
  name: string | null
  subject: string | null
  class_level: string | null
  budget: number | string | null
  details: string | null
  status: string
  created_at: string
  phone: string | null // null until tutor is interested
}

const WAITING = ['new', 'contacted', 'in_progress']

export default function TutorBookingRequests() {
  const [rows, setRows] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('tutor_booking_requests')
      .select('id, name, subject, class_level, budget, details, status, created_at, phone')
      .order('created_at', { ascending: false })

    if (queryError) setError('রিকোয়েস্ট লোড করা যায়নি।')
    else setRows((data ?? []) as Request[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function respond(id: string, interested: boolean) {
    if (interested && !window.confirm('আগ্রহী হলে অভিভাবকের ফোন নম্বর দেখা যাবে এবং অ্যাডমিন জানতে পারবেন। নিশ্চিত?')) return
    setBusyId(id)
    setError('')
    const { error: rpcError } = await supabase.rpc('tutor_respond_booking', {
      p_booking_id: id,
      p_interested: interested,
    })
    if (rpcError) setError('আপনার উত্তর সেভ করা যায়নি। আবার চেষ্টা করুন।')
    else await load() // reload so phone appears right away
    setBusyId('')
  }

  if (loading) return null

  if (rows.length === 0) {
    return error ? (
      <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
    ) : null
  }

  return (
    <div className="mb-4 grid gap-4">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {rows.map((item) => {
        const waiting = WAITING.includes(item.status)
        const interested = item.status === 'tutor_interested' || item.status === 'approved'
        const busy = busyId === item.id

        return (
          <article key={item.id} className="rounded-xl bg-sky-50/60 p-4 ring-1 ring-sky-100">
            <h3 className="font-bold text-primary">সরাসরি টিউটর রিকোয়েস্ট</h3>

            <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p><span className="text-gray-500">অভিভাবক/স্টুডেন্ট:</span> {item.name || '—'}</p>
              <p><span className="text-gray-500">বিষয়:</span> {item.subject || '—'}</p>
              <p><span className="text-gray-500">ক্লাস:</span> {item.class_level || '—'}</p>
              <p><span className="text-gray-500">বাজেট:</span> {item.budget ?? '—'}</p>
            </div>

            {item.details && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-white p-3 text-sm leading-7 text-gray-600">{item.details}</p>
            )}

            {/* Phone area */}
            <div className="mt-3">
              {interested && item.phone ? (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  অভিভাবকের ফোন:{' '}
                  <a href={`tel:${item.phone}`} className="underline">{item.phone}</a>
                </p>
              ) : item.status === 'tutor_declined' ? (
                <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-600">আপনি এই রিকোয়েস্টে আগ্রহী নন বলে জানিয়েছেন।</p>
              ) : (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  অভিভাবকের ফোন নম্বর লুকানো আছে। আগ্রহী হলে নম্বর দেখতে পাবেন।
                </p>
              )}
            </div>

            {waiting && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(item.id, true)}
                  className="min-h-10 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? 'অপেক্ষা করুন...' : 'আমি আগ্রহী'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(item.id, false)}
                  className="min-h-10 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  আগ্রহী নই
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}