// 'use client'

// import { useEffect, useState } from 'react'
// import { districtLabel, formatSalary, toBengaliDigits } from '../../lib/jobBoard'
// import { supabase } from '../../lib/supabaseClient'

// type JobRow = { id: string; title: string | null; subject: string | null; class_level: string | null; district: string | null; locality: string | null; salary: number | string | null; days_per_week: number | string | null; details: string | null; contact_name: string | null; contact_phone: string | null; status: string | null; admin_note: string | null; created_at: string | null }
// const tabs = [['pending', 'অপেক্ষমাণ'], ['open', 'চালু'], ['closed', 'বন্ধ'], ['rejected', 'বাতিল'], ['all', 'সব']] as const
// const statusInfo: Record<string, { label: string; style: string }> = { pending: { label: 'অপেক্ষমাণ', style: 'bg-amber-100 text-amber-800' }, open: { label: 'চালু', style: 'bg-green-100 text-green-800' }, closed: { label: 'বন্ধ', style: 'bg-slate-200 text-slate-700' }, rejected: { label: 'বাতিল', style: 'bg-red-100 text-red-800' } }

// function whatsappNumber(phone: string) { const digits = phone.replace(/\D/g, ''); return digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : `880${digits}` }

// export default function JobsAdminTable() {
//   const [rows, setRows] = useState<JobRow[]>([])
//   const [status, setStatus] = useState('pending')
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState('')
//   const [saving, setSaving] = useState<string | null>(null)
//   const [toast, setToast] = useState('')

//   useEffect(() => { async function load() { const { data, error: queryError } = await supabase.from('job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, contact_name, contact_phone, status, admin_note, created_at').order('created_at', { ascending: false }); if (queryError) setError('জব পোস্ট লোড করা যায়নি'); else setRows((data ?? []) as JobRow[]); setLoading(false) }; void load() }, [])

//   async function updateJob(id: string, values: { status?: string; admin_note?: string }) { setSaving(id); setError(''); const { error: updateError } = await supabase.from('job_posts').update(values).eq('id', id); if (updateError) setError('জব পোস্ট আপডেট করা যায়নি'); else { setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row)); setToast('সেভ হয়েছে'); window.setTimeout(() => setToast(''), 2200) }; setSaving(null) }

//   const visibleRows = rows.filter((row) => status === 'all' || (row.status ?? 'pending') === status)
//   const date = (row: JobRow) => row.created_at ? new Date(row.created_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
//   const badge = (row: JobRow) => { const item = statusInfo[row.status || 'pending'] || statusInfo.pending; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.style}`}>{item.label}</span> }
//   const contact = (row: JobRow) => <div><p>{row.contact_name || 'নাম নেই'}</p><p className="text-slate-500">{row.contact_phone || 'ফোন নেই'}</p>{row.contact_phone && <div className="mt-2 flex gap-2"><a href={`tel:${row.contact_phone}`} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">কল</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(row.contact_phone)}`} className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white">WhatsApp</a></div>}</div>
//   const note = (row: JobRow) => <textarea aria-label={`${row.title || 'জব'} অ্যাডমিন নোট`} defaultValue={row.admin_note || ''} onBlur={(event) => { if (event.target.value !== (row.admin_note || '')) void updateJob(row.id, { admin_note: event.target.value }) }} className="min-h-20 w-full rounded-lg border border-slate-200 p-2 text-xs" placeholder="অ্যাডমিন নোট" />
//   const actions = (row: JobRow) => <div className="flex flex-wrap gap-2">{row.status === 'pending' && <button type="button" disabled={saving === row.id} onClick={() => void updateJob(row.id, { status: 'open' })} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">অনুমোদন করুন</button>}{row.status !== 'rejected' && <button type="button" disabled={saving === row.id} onClick={() => void updateJob(row.id, { status: 'rejected' })} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">বাতিল</button>}{row.status !== 'closed' && <button type="button" disabled={saving === row.id} onClick={() => void updateJob(row.id, { status: 'closed' })} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">বন্ধ করুন</button>}{row.status === 'closed' && <button type="button" disabled={saving === row.id} onClick={() => void updateJob(row.id, { status: 'open' })} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">আবার চালু করুন</button>}</div>

//   return <div className="relative rounded-2xl bg-white p-4 shadow-sm sm:p-6">{toast && <div className="fixed right-4 top-4 z-30 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">{toast}</div>}<div className="flex flex-wrap gap-2 border-b pb-4">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}>{label}{value === 'pending' && <span className="ml-1">({toBengaliDigits(rows.filter((row) => (row.status ?? 'pending') === 'pending').length)})</span>}</button>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-slate-500">এই স্ট্যাটাসে কোনো জব নেই</p> : <><div className="mt-5 space-y-4 xl:hidden">{visibleRows.map((row) => <article key={row.id} className={`rounded-xl border p-4 ${row.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{date(row)}</p><h2 className="mt-1 font-bold text-blue-950">{row.title || 'জব'}</h2><p className="mt-1 text-sm text-slate-600">{row.subject || '—'} · {row.class_level || '—'}</p></div>{badge(row)}</div><div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><p><span className="block text-xs text-slate-500">এলাকা</span>{districtLabel(row.district)}{row.locality && ` · ${row.locality}`}</p><p><span className="block text-xs text-slate-500">বেতন ও দিন</span>{formatSalary(row.salary)} · সপ্তাহে {toBengaliDigits(row.days_per_week ?? '—')} দিন</p><p className="sm:col-span-2"><span className="block text-xs text-slate-500">বিস্তারিত</span>{row.details || 'বিস্তারিত নেই'}</p><div><span className="block text-xs text-slate-500">যোগাযোগ</span>{contact(row)}</div><div><span className="block text-xs text-slate-500">অ্যাডমিন নোট</span>{note(row)}</div></div><div className="mt-4 border-t pt-3">{actions(row)}</div></article>)}</div><div className="mt-5 hidden xl:block"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="px-3 py-3">তারিখ / জব</th><th className="px-3 py-3">এলাকা</th><th className="px-3 py-3">বেতন</th><th className="px-3 py-3">যোগাযোগ</th><th className="px-3 py-3">স্ট্যাটাস / নোট</th><th className="px-3 py-3">অ্যাকশন</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className={`border-b align-top last:border-0 ${row.status === 'pending' ? 'bg-amber-50/50' : ''}`}><td className="max-w-xs px-3 py-4"><p className="text-xs text-slate-500">{date(row)}</p><p className="mt-1 font-semibold text-blue-950">{row.title || 'জব'}</p><p className="mt-1 text-slate-500">{row.subject || '—'} · {row.class_level || '—'}</p></td><td className="px-3 py-4">{districtLabel(row.district)}{row.locality && ` · ${row.locality}`}</td><td className="whitespace-nowrap px-3 py-4">{formatSalary(row.salary)}<br /><span className="text-slate-500">সপ্তাহে {toBengaliDigits(row.days_per_week ?? '—')} দিন</span></td><td className="px-3 py-4">{contact(row)}</td><td className="w-48 px-3 py-4">{badge(row)}<div className="mt-2">{note(row)}</div></td><td className="px-3 py-4">{actions(row)}</td></tr>)}</tbody></table></div></>}</div>
// }
'use client'

import { useEffect, useState } from 'react'
import { districtLabel, formatSalary, toBengaliDigits } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'

type JobRow = {
  id: string
  title: string | null
  subject: string | null
  class_level: string | null
  district: string | null
  locality: string | null
  salary: number | string | null
  days_per_week: number | string | null
  details: string | null
  contact_name: string | null
  contact_phone: string | null
  status: string | null
  admin_note: string | null
  created_at: string | null
  gender_preference: string | null
  student_count: number | null
  preferred_time: string | null
  medium: string | null
  hiring_status: string | null
}

type Values = { status?: string; admin_note?: string; hiring_status?: string }

const COLUMNS =
  'id, title, subject, class_level, district, locality, salary, days_per_week, details, contact_name, contact_phone, status, admin_note, created_at, gender_preference, student_count, preferred_time, medium, hiring_status'

const tabs = [
  ['pending', 'অপেক্ষমাণ'],
  ['open', 'চালু'],
  ['filled', 'নিয়োগ সম্পন্ন'],
  ['closed', 'বন্ধ'],
  ['rejected', 'বাতিল'],
  ['all', 'সব'],
] as const

const statusInfo: Record<string, { label: string; style: string }> = {
  pending: { label: 'অপেক্ষমাণ', style: 'bg-amber-100 text-amber-800' },
  open: { label: 'চালু', style: 'bg-green-100 text-green-800' },
  closed: { label: 'বন্ধ', style: 'bg-slate-200 text-slate-700' },
  rejected: { label: 'বাতিল', style: 'bg-red-100 text-red-800' },
}

const GENDER_TEXT: Record<string, string> = { male: 'ছেলে টিউটর', female: 'মেয়ে টিউটর', any: 'যেকোনো' }

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : `880${digits}`
}

function matchesTab(row: JobRow, tab: string) {
  const status = row.status ?? 'pending'
  const filled = row.hiring_status === 'filled'
  if (tab === 'all') return true
  if (tab === 'filled') return status === 'open' && filled
  if (tab === 'open') return status === 'open' && !filled
  return status === tab
}

function Cell({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{children}</div>
    </div>
  )
}

export default function JobsAdminTable() {
  const [rows, setRows] = useState<JobRow[]>([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase
        .from('job_posts')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
      if (queryError) setError('জব পোস্ট লোড করা যায়নি')
      else setRows((data ?? []) as JobRow[])
      setLoading(false)
    }
    void load()
  }, [])

  async function updateJob(id: string, values: Values) {
    setSaving(id)
    setError('')
    const { error: updateError } = await supabase.from('job_posts').update(values).eq('id', id)
    if (updateError) {
      setError('জব পোস্ট আপডেট করা যায়নি')
    } else {
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...values } : row)))
      setToast('সেভ হয়েছে')
      window.setTimeout(() => setToast(''), 2200)
    }
    setSaving(null)
  }

  function markFilled(id: string) {
    if (window.confirm('জব বোর্ডে "নিয়োগ সম্পন্ন" দেখাবে এবং নতুন আবেদন বন্ধ হবে। নিশ্চিত?')) {
      void updateJob(id, { hiring_status: 'filled' })
    }
  }

  const visibleRows = rows.filter((row) => matchesTab(row, tab))
  const pendingCount = rows.filter((row) => (row.status ?? 'pending') === 'pending').length

  const date = (row: JobRow) =>
    row.created_at ? new Date(row.created_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const btn = 'rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50'

  return (
    <div className="relative rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {toast && (
        <div className="fixed right-4 top-4 z-30 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}
          >
            {label}
            {value === 'pending' && <span className="ml-1">({toBengaliDigits(pendingCount)})</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p>
      ) : visibleRows.length === 0 ? (
        <p className="py-12 text-center text-slate-500">এই স্ট্যাটাসে কোনো জব নেই</p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visibleRows.map((row) => {
            const status = row.status || 'pending'
            const info = statusInfo[status] || statusInfo.pending
            const filled = status === 'open' && row.hiring_status === 'filled'
            const busy = saving === row.id
            const gender = row.gender_preference ? GENDER_TEXT[row.gender_preference] : null

            return (
              <article
                key={row.id}
                className={`flex flex-col rounded-2xl border p-4 ${status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}
              >
                {/* header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{date(row)}</p>
                    <h2 className="mt-1 font-bold text-blue-950">{row.title || 'জব'}</h2>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${info.style}`}>{info.label}</span>
                    {filled && (
                      <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">নিয়োগ সম্পন্ন</span>
                    )}
                  </div>
                </div>

                {/* everything the guardian filled in */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-3">
                  <Cell label="বিষয়">{row.subject || '—'}</Cell>
                  <Cell label="ক্লাস / লেভেল">{row.class_level || '—'}</Cell>
                  <Cell label="এলাকা" wide>
                    {[districtLabel(row.district), row.locality].filter(Boolean).join(', ') || '—'}
                  </Cell>
                  <Cell label="বেতন">{formatSalary(row.salary)}</Cell>
                  <Cell label="সপ্তাহে">{toBengaliDigits(row.days_per_week ?? '—')} দিন</Cell>
                  <Cell label="শিক্ষার্থী">{row.student_count ? `${toBengaliDigits(row.student_count)} জন` : '—'}</Cell>
                  <Cell label="কেমন টিউটর">{gender || '—'}</Cell>
                  <Cell label="মাধ্যম">{row.medium || '—'}</Cell>
                  <Cell label="পছন্দের সময়">{row.preferred_time || '—'}</Cell>
                </div>

                {row.details && (
                  <p className="mt-3 whitespace-pre-line rounded-xl border border-slate-100 p-3 text-sm leading-7 text-slate-600">{row.details}</p>
                )}

                {/* private: guardian contact */}
                <div className="mt-3 rounded-xl bg-blue-50/60 p-3">
                  <p className="text-xs text-slate-500">অভিভাবকের যোগাযোগ (শুধু অ্যাডমিন দেখছেন)</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{row.contact_name || 'নাম নেই'}</p>
                  <p className="text-sm text-slate-600">{row.contact_phone || 'ফোন নেই'}</p>
                  {row.contact_phone && (
                    <div className="mt-2 flex gap-2">
                      <a href={`tel:${row.contact_phone}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">কল</a>
                      <a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(row.contact_phone)}`} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">WhatsApp</a>
                    </div>
                  )}
                </div>

                {/* admin note */}
                <textarea
                  aria-label={`${row.title || 'জব'} অ্যাডমিন নোট`}
                  defaultValue={row.admin_note || ''}
                  onBlur={(event) => {
                    if (event.target.value !== (row.admin_note || '')) void updateJob(row.id, { admin_note: event.target.value })
                  }}
                  className="mt-3 min-h-16 w-full rounded-lg border border-slate-200 p-2 text-xs"
                  placeholder="অ্যাডমিন নোট (শুধু আপনারা দেখবেন)"
                />

                {/* actions */}
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                  {status === 'pending' && (
                    <button type="button" disabled={busy} onClick={() => void updateJob(row.id, { status: 'open' })} className={`${btn} bg-green-600`}>
                      অনুমোদন করুন
                    </button>
                  )}

                  {status === 'open' && !filled && (
                    <button type="button" disabled={busy} onClick={() => markFilled(row.id)} className={`${btn} bg-emerald-700`}>
                      নিয়োগ সম্পন্ন করুন
                    </button>
                  )}
                  {status === 'open' && filled && (
                    <button type="button" disabled={busy} onClick={() => void updateJob(row.id, { hiring_status: 'open' })} className={`${btn} bg-primary`}>
                      আবার আবেদন চালু করুন
                    </button>
                  )}

                  {status === 'closed' && (
                    <button type="button" disabled={busy} onClick={() => void updateJob(row.id, { status: 'open' })} className={`${btn} bg-primary`}>
                      আবার চালু করুন
                    </button>
                  )}
                  {status !== 'closed' && status !== 'rejected' && status !== 'pending' && (
                    <button type="button" disabled={busy} onClick={() => void updateJob(row.id, { status: 'closed' })} className={`${btn} bg-slate-700`}>
                      বন্ধ করুন
                    </button>
                  )}
                  {status !== 'rejected' && (
                    <button type="button" disabled={busy} onClick={() => void updateJob(row.id, { status: 'rejected' })} className={`${btn} bg-red-600`}>
                      বাতিল
                    </button>
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