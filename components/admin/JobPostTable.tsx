'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { districtLabel, formatSalary, toBengaliDigits } from '../../lib/jobBoard'

type JobRow = { id: string; title: string | null; subject: string | null; class_level: string | null; district: string | null; locality: string | null; salary: number | string | null; days_per_week: number | string | null; details: string | null; contact_name: string | null; contact_phone: string | null; status: string | null; created_at: string | null }
const tabs = [['pending', 'অপেক্ষমাণ'], ['open', 'চালু'], ['closed', 'বন্ধ'], ['rejected', 'বাতিল']] as const
function whatsappNumber(phone: string) { return phone.replace(/[^0-9]/g, '').replace(/^0/, '880') }

export default function JobPostTable() {
  const [rows, setRows] = useState<JobRow[]>([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: queryError } = await supabase.from('job_posts').select('id, title, subject, class_level, district, locality, salary, days_per_week, details, contact_name, contact_phone, status, created_at').order('created_at', { ascending: false })
      if (queryError) setError('জব পোস্ট লোড করা যায়নি')
      else setRows((data ?? []) as JobRow[])
      setLoading(false)
    }
    void load()
  }, [])

  async function updateStatus(id: string, nextStatus: string) {
    const { error: updateError } = await supabase.from('job_posts').update({ status: nextStatus }).eq('id', id)
    if (updateError) setError('স্ট্যাটাস পরিবর্তন করা যায়নি')
    else setRows((current) => current.map((row) => row.id === id ? { ...row, status: nextStatus } : row))
  }

  const visibleRows = rows.filter((row) => String(row.status ?? 'pending') === status)
  return <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap gap-2 border-b pb-4">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}>{label}</button>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-slate-500">এই স্ট্যাটাসে কোনো জব নেই</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="px-3 py-3">জব</th><th className="px-3 py-3">যোগাযোগ</th><th className="px-3 py-3">এলাকা</th><th className="px-3 py-3">বেতন</th><th className="px-3 py-3">তারিখ</th><th className="px-3 py-3">অ্যাকশন</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b align-top last:border-0"><td className="px-3 py-4"><p className="font-semibold text-blue-950">{row.title || 'জব'}</p><p className="mt-1 text-slate-500">{row.subject} · {row.class_level}</p></td><td className="px-3 py-4"><p>{row.contact_name || 'নাম নেই'}</p><p className="text-slate-500">{row.contact_phone || 'ফোন নেই'}</p></td><td className="px-3 py-4">{districtLabel(row.district)}{row.locality && ` · ${row.locality}`}</td><td className="px-3 py-4">{formatSalary(row.salary)}</td><td className="whitespace-nowrap px-3 py-4 text-slate-500">{row.created_at ? toBengaliDigits(new Date(row.created_at).toLocaleDateString('en-GB')) : '—'}</td><td className="px-3 py-4"><div className="flex flex-wrap gap-2">{status === 'pending' && <button type="button" onClick={() => void updateStatus(row.id, 'open')} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white">অনুমোদন</button>}{status !== 'closed' && status !== 'rejected' && <button type="button" onClick={() => void updateStatus(row.id, 'closed')} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">বন্ধ করুন</button>}{status !== 'rejected' && <button type="button" onClick={() => void updateStatus(row.id, 'rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">বাতিল</button>}{row.contact_phone && <><a href={`tel:${row.contact_phone}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">কল</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(row.contact_phone)}`} className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white"><ExternalLink size={14} /> WhatsApp</a></>}</div></td></tr>)}</tbody></table></div>}</div>
}
