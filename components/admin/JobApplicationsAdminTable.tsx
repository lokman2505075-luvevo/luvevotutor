'use client'

import { useEffect, useState } from 'react'
import { districtLabel } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'

type Application = { id: string; job_id: string; tutor_id: string; message: string | null; status: string; admin_note: string | null; created_at: string }
type JobContact = { id: string; title: string | null; contact_name: string | null; contact_phone: string | null }
type Tutor = { id: string; full_name: string | null; phone: string | null; email: string | null; subjects: string[] | null; district: string | null }
type Row = Application & { job?: JobContact; tutor?: Tutor }

const statuses = [
  ['new', 'নতুন', 'bg-blue-100 text-blue-800'],
  ['contacted', 'যোগাযোগ করা হয়েছে', 'bg-amber-100 text-amber-800'],
  ['in_progress', 'চলমান', 'bg-purple-100 text-purple-800'],
  ['completed', 'সম্পন্ন', 'bg-green-100 text-green-800'],
  ['cancelled', 'বাতিল', 'bg-red-100 text-red-800'],
] as const

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : `880${digits}`
}

export default function JobApplicationsAdminTable() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      const { data: applications, error: applicationError } = await supabase
        .from('job_applications')
        .select('id, job_id, tutor_id, message, status, admin_note, created_at')
        .order('created_at', { ascending: false })
      if (applicationError) { setError('আবেদন লোড করা যায়নি'); setLoading(false); return }
      const applicationRows = (applications ?? []) as Application[]
      const jobIds = Array.from(new Set(applicationRows.map((row) => row.job_id)))
      const tutorIds = Array.from(new Set(applicationRows.map((row) => row.tutor_id)))
      const [{ data: jobs, error: jobError }, { data: tutors, error: tutorError }] = await Promise.all([
        jobIds.length ? supabase.from('job_posts').select('id, title, contact_name, contact_phone').in('id', jobIds) : Promise.resolve({ data: [], error: null }),
        tutorIds.length ? supabase.from('profiles').select('id, full_name, phone, email, subjects, district').in('id', tutorIds) : Promise.resolve({ data: [], error: null }),
      ])
      if (jobError || tutorError) setError('আবেদনের যোগাযোগের তথ্য সম্পূর্ণ লোড করা যায়নি')
      const jobMap = new Map((jobs ?? []).map((job) => [job.id, job as JobContact]))
      const tutorMap = new Map((tutors ?? []).map((tutor) => [tutor.id, tutor as Tutor]))
      setRows(applicationRows.map((row) => ({ ...row, job: jobMap.get(row.job_id), tutor: tutorMap.get(row.tutor_id) })))
      setLoading(false)
    }
    void load()
  }, [])

  async function updateApplication(id: string, values: { status?: string; admin_note?: string }) {
    setSaving(id)
    const { error: updateError } = await supabase.from('job_applications').update(values).eq('id', id)
    if (updateError) setError('আবেদন আপডেট করা যায়নি')
    else {
      setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row))
      setToast('সেভ হয়েছে')
      window.setTimeout(() => setToast(''), 2200)
    }
    setSaving(null)
  }

  const visibleRows = rows.filter((row) => filter === 'all' || row.status === filter)
  const statusBadge = (value: string) => {
    const item = statuses.find(([key]) => key === value) || statuses[0]
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item[2]}`}>{item[1]}</span>
  }
  const contactActions = (phone: string | null | undefined) => phone && <div className="mt-2 flex gap-2"><a href={`tel:${phone}`} className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white">কল</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(phone)}`} className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white">WhatsApp</a></div>
  const person = (row: Row, type: 'tutor' | 'guardian') => type === 'tutor' ? <><p>{row.tutor?.full_name || 'নাম নেই'}</p><p className="text-slate-500">{row.tutor?.phone || row.tutor?.email || '—'}</p><p className="text-xs text-slate-500">{row.tutor?.subjects?.join(', ') || 'বিষয় নেই'}{row.tutor?.district ? ` · ${districtLabel(row.tutor.district)}` : ''}</p>{contactActions(row.tutor?.phone)}</> : <><p>{row.job?.contact_name || 'নাম নেই'}</p><p className="text-slate-500">{row.job?.contact_phone || '—'}</p>{contactActions(row.job?.contact_phone)}</>
  const note = (row: Row) => <textarea aria-label="অ্যাডমিন নোট" defaultValue={row.admin_note || ''} onBlur={(event) => { if (event.target.value !== (row.admin_note || '')) void updateApplication(row.id, { admin_note: event.target.value }) }} className="min-h-20 w-full rounded-lg border border-slate-200 p-2 text-xs" placeholder="নোট" />
  const date = (row: Row) => new Date(row.created_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })

  return <div className="relative rounded-2xl bg-white p-4 shadow-sm sm:p-6">
    {toast && <div className="fixed right-4 top-4 z-30 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">{toast}</div>}
    <div className="flex flex-wrap gap-2 border-b pb-4"><button type="button" onClick={() => setFilter('all')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>সব</button>{statuses.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>{label}{value === 'new' && <span className="ml-1">({rows.filter((row) => row.status === 'new').length})</span>}</button>)}</div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    {loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-slate-500">কোনো আবেদন নেই</p> : <>
      <div className="mt-5 space-y-4 xl:hidden">{visibleRows.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{date(row)}</p><h2 className="mt-1 font-bold text-blue-950">{row.job?.title || 'জব'}</h2></div>{statusBadge(row.status)}</div><div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><p className="mb-1 text-xs text-slate-500">টিউটর</p>{person(row, 'tutor')}</div><div><p className="mb-1 text-xs text-slate-500">অভিভাবক</p>{person(row, 'guardian')}</div><p><span className="block text-xs text-slate-500">বার্তা</span>{row.message || '—'}</p><div><span className="block text-xs text-slate-500">অ্যাডমিন নোট</span>{note(row)}</div></div><div className="mt-4 border-t pt-3"><select disabled={saving === row.id} value={row.status} onChange={(event) => void updateApplication(row.id, { status: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div>
      <div className="mt-5 hidden xl:block"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="px-3 py-3">তারিখ / জব</th><th className="px-3 py-3">টিউটর</th><th className="px-3 py-3">অভিভাবক</th><th className="px-3 py-3">বার্তা</th><th className="px-3 py-3">স্ট্যাটাস</th><th className="px-3 py-3">নোট</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b align-top last:border-0"><td className="max-w-xs px-3 py-4"><p className="text-xs text-slate-500">{date(row)}</p><p className="mt-1 font-semibold text-blue-950">{row.job?.title || 'জব'}</p></td><td className="px-3 py-4">{person(row, 'tutor')}</td><td className="px-3 py-4">{person(row, 'guardian')}</td><td className="max-w-xs px-3 py-4 text-slate-600">{row.message || '—'}</td><td className="px-3 py-4"><div>{statusBadge(row.status)}</div><select disabled={saving === row.id} value={row.status} onChange={(event) => void updateApplication(row.id, { status: event.target.value })} className="mt-2 rounded-lg border border-slate-200 px-2 py-2">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="w-48 px-3 py-4">{note(row)}</td></tr>)}</tbody></table></div>
    </>}
  </div>
}
