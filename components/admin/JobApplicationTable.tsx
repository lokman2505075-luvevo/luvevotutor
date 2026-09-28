'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type ApplicationRow = { id: string; message: string | null; status: string; admin_note: string | null; created_at: string; job_posts?: { title: string | null; contact_name: string | null; contact_phone: string | null }[] | null; profiles?: { full_name: string | null; phone: string | null; subjects: string[] | null; district: string | null }[] | null }
const statuses = [['new', 'নতুন'], ['contacted', 'যোগাযোগ হয়েছে'], ['in_progress', 'চলমান'], ['completed', 'সম্পন্ন'], ['cancelled', 'বাতিল']] as const

function whatsappNumber(phone: string) { return phone.replace(/[^0-9]/g, '').replace(/^0/, '880') }

export default function JobApplicationTable() {
  const [rows, setRows] = useState<ApplicationRow[]>([])
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: queryError } = await supabase.from('job_applications').select('id, message, status, admin_note, created_at, job_posts(title, contact_name, contact_phone), profiles(full_name, phone, subjects, district)').order('created_at', { ascending: false })
      if (queryError) setError('আবেদন লোড করা যায়নি')
      else setRows((data ?? []) as ApplicationRow[])
      setLoading(false)
    }
    void load()
  }, [])

  async function updateApplication(id: string, values: Record<string, string>) {
    const { error: updateError } = await supabase.from('job_applications').update(values).eq('id', id)
    if (updateError) setError('আবেদন আপডেট করা যায়নি')
    else setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row))
  }

  const visibleRows = status === 'all' ? rows : rows.filter((row) => row.status === status)
  return <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap gap-2 border-b pb-4"><button type="button" onClick={() => setStatus('all')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>সব</button>{statuses.map(([value, label]) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-slate-500">কোনো আবেদন নেই</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-[1250px] w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="px-3 py-3">জব</th><th className="px-3 py-3">টিউটর</th><th className="px-3 py-3">অভিভাবক</th><th className="px-3 py-3">বার্তা</th><th className="px-3 py-3">স্ট্যাটাস</th><th className="px-3 py-3">নোট</th></tr></thead><tbody>{visibleRows.map((row) => { const tutor = row.profiles?.[0]; const guardian = row.job_posts?.[0]; return <tr key={row.id} className="border-b align-top last:border-0"><td className="px-3 py-4 font-semibold text-blue-950">{guardian?.title || 'জব'}</td><td className="px-3 py-4"><p>{tutor?.full_name || 'নাম নেই'}</p><p className="text-slate-500">{tutor?.phone || '—'}</p><p className="text-xs text-slate-500">{tutor?.district || ''}</p><div className="mt-2 flex gap-2">{tutor?.phone && <><a href={`tel:${tutor.phone}`} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">কল</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(tutor.phone)}`} className="rounded bg-green-500 px-2 py-1 text-xs text-white">WhatsApp</a></>}</div></td><td className="px-3 py-4"><p>{guardian?.contact_name || 'নাম নেই'}</p><p className="text-slate-500">{guardian?.contact_phone || '—'}</p><div className="mt-2 flex gap-2">{guardian?.contact_phone && <><a href={`tel:${guardian.contact_phone}`} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">কল</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(guardian.contact_phone)}`} className="rounded bg-green-500 px-2 py-1 text-xs text-white">WhatsApp</a></>}</div></td><td className="max-w-xs px-3 py-4 text-slate-600">{row.message || '—'}</td><td className="px-3 py-4"><select value={row.status} onChange={(event) => void updateApplication(row.id, { status: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-2">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-3 py-4"><textarea defaultValue={row.admin_note || ''} onBlur={(event) => { if (event.target.value !== (row.admin_note || '')) void updateApplication(row.id, { admin_note: event.target.value }) }} className="min-h-20 w-48 rounded-lg border border-slate-200 p-2" placeholder="নোট" /><ExternalLink size={14} className="mt-2 text-slate-400" /></td></tr> })}</tbody></table></div>}</div>
}
