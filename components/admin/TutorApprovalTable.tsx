'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TutorRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  subjects: string[] | null
  district: string | null
  short_bio: string | null
  status: 'pending' | 'approved' | 'rejected' | string | null
  created_at: string | null
}

type Filter = 'pending' | 'approved' | 'rejected'

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export default function TutorApprovalTable() {
  const [rows, setRows] = useState<TutorRow[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadTutors() {
      setLoading(true)
      setError('')
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, subjects, district, short_bio, status, created_at')
        .eq('role', 'tutor')
        .order('created_at', { ascending: false })

      if (queryError) setError('টিউটরদের তথ্য লোড করা যায়নি')
      else setRows((data ?? []) as TutorRow[])
      setLoading(false)
    }

    void loadTutors()
  }, [])

  async function changeStatus(row: TutorRow, nextStatus: 'approved' | 'rejected') {
    const action = nextStatus === 'approved' ? 'অনুমোদন' : 'বাতিল'
    if (!window.confirm(`আপনি কি এই টিউটরের আবেদন ${action} করতে চান?`)) return

    setSavingId(row.id)
    setError('')
    const { error: updateError } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', row.id).eq('role', 'tutor')
    if (updateError) setError('টিউটরের স্ট্যাটাস পরিবর্তন করা যায়নি')
    else setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: nextStatus } : item))
    setSavingId(null)
  }

  const visibleRows = rows.filter((row) => row.status === filter)

  return <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap gap-2 border-b pb-4">
      {([['pending', 'অপেক্ষমাণ'], ['approved', 'অনুমোদিত'], ['rejected', 'বাতিল']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}>{label}</button>)}
    </div>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-gray-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-gray-500">কোনো টিউটর পাওয়া যায়নি</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="px-3 py-3">নাম</th><th className="px-3 py-3">ফোন</th><th className="px-3 py-3">ইমেইল</th><th className="px-3 py-3">বিষয়</th><th className="px-3 py-3">জেলা</th><th className="px-3 py-3">পরিচিতি</th><th className="px-3 py-3">তারিখ</th><th className="px-3 py-3">অবস্থা</th><th className="px-3 py-3">অ্যাকশন</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b align-top last:border-0"><td className="px-3 py-4 font-medium">{display(row.full_name)}</td><td className="px-3 py-4">{display(row.phone)}</td><td className="px-3 py-4">{display(row.email)}</td><td className="max-w-xs px-3 py-4">{display(row.subjects)}</td><td className="px-3 py-4">{display(row.district)}</td><td className="max-w-xs px-3 py-4">{display(row.short_bio)}</td><td className="whitespace-nowrap px-3 py-4">{row.created_at ? new Date(row.created_at).toLocaleDateString('bn-BD') : '—'}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'approved' ? 'bg-green-100 text-green-700' : row.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status === 'approved' ? 'অনুমোদিত' : row.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমাণ'}</span></td><td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={savingId === row.id || row.status === 'approved'} onClick={() => void changeStatus(row, 'approved')} className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">অনুমোদন করুন</button><button type="button" disabled={savingId === row.id || row.status === 'rejected'} onClick={() => void changeStatus(row, 'rejected')} className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">বাতিল করুন</button></div></td></tr>)}</tbody></table></div>}
  </div>
}