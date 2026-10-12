"use client"

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Card, Pill } from './ui'

const DOCS = [
  { type: 'nid', label: 'জাতীয় পরিচয়পত্র (NID)', hint: 'সামনে ও পেছনের পাতার স্পষ্ট ছবি বা PDF' },
  { type: 'student_id', label: 'স্টুডেন্ট আইডি কার্ড', hint: 'নাম ও ছবি পড়া যায় এমন স্পষ্ট ছবি বা PDF' },
]

const STATUS = {
  pending: { label: 'যাচাই চলছে', tone: 'amber' },
  approved: { label: 'যাচাই হয়েছে', tone: 'green' },
  rejected: { label: 'গ্রহণযোগ্য নয়, আবার দিন', tone: 'red' },
} as const

type DocRow = { doc_type: string; status: keyof typeof STATUS; file_name: string | null }

export default function VerificationCard({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<Record<string, DocRow>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  async function load() {
    const { data } = await supabase.from('tutor_documents').select('doc_type,status,file_name').eq('tutor_id', userId)
    setDocs(Object.fromEntries((data ?? []).map((d: DocRow) => [d.doc_type, d])))
  }

  useEffect(() => {
    void load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(type: string, file: File) {
    setError('')
    if (file.size > 5 * 1024 * 1024) return setError('ফাইল ৫ MB এর বেশি হতে পারবে না')
    if (!/^(image\/|application\/pdf)/.test(file.type)) return setError('শুধু ছবি অথবা PDF দিন')

    setBusy(type)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${type}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('verification-docs').upload(path, file)
    if (upErr) {
      setBusy('')
      return setError(upErr.message)
    }
    const { error: dbErr } = await supabase.from('tutor_documents').upsert(
      { tutor_id: userId, doc_type: type, file_path: path, file_name: file.name, status: 'pending' },
      { onConflict: 'tutor_id,doc_type' }
    )
    setBusy('')
    if (dbErr) return setError(dbErr.message)
    await load()
  }

  return (
    <Card
      title="পরিচয় যাচাই"
      hint="ডকুমেন্ট গোপন থাকে — শুধু Luvevo অ্যাডমিন দেখতে পারেন। যাচাই শেষ হলে আপনি ভেরিফাইড ব্যাজ পাবেন।"
    >
      <ul className="divide-y divide-gray-100">
        {DOCS.map((d) => {
          const row = docs[d.type]
          const st = row ? STATUS[row.status] : null
          return (
            <li key={d.type} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium">{d.label}</p>
                <p className="text-sm text-gray-500">{row?.file_name ?? d.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                {st ? <Pill tone={st.tone}>{st.label}</Pill> : <Pill tone="gray">জমা হয়নি</Pill>}
                <input
                  ref={(el) => {
                    inputs.current[d.type] = el
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void upload(d.type, f)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  disabled={busy === d.type || row?.status === 'approved'}
                  onClick={() => inputs.current[d.type]?.click()}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {busy === d.type ? 'আপলোড হচ্ছে...' : row ? 'পরিবর্তন করুন' : 'আপলোড করুন'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </Card>
  )
}