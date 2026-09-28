'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchRequestRows, formatDate, getFirstValue, getRowDate, type RequestRow } from '../../components/admin/adminData'
import { ALL_REQUEST_CONFIGS, REQUEST_STATUSES } from '../../components/admin/requestConfig'

type LatestRequest = { row: RequestRow; label: string; key: string; date: number; config: (typeof ALL_REQUEST_CONFIGS)[number] }

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<LatestRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const results = await Promise.all(ALL_REQUEST_CONFIGS.map(async (config) => ({ config, result: await fetchRequestRows(config) })))
      const latest: LatestRequest[] = []
      results.forEach(({ config, result }) => result.data.forEach((row) => latest.push({ row, label: config.label, key: config.key, date: getRowDate(row, config), config })))
      setRows(latest.sort((first, second) => second.date - first.date))
      setLoading(false)
    }

    void loadDashboard()
  }, [])

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const total = rows.length
  const newToday = rows.filter((item) => item.date >= startOfToday).length
  const pending = rows.filter((item) => ['new', 'contacted'].includes(String(item.row.status ?? 'new'))).length
  const completedThisMonth = rows.filter((item) => item.row.status === 'completed' && item.date >= startOfMonth).length

  const cards = [
    { label: 'মোট রিকোয়েস্ট', value: total, color: 'bg-blue-50 text-blue-800' },
    { label: 'আজকের নতুন', value: newToday, color: 'bg-yellow-50 text-yellow-800' },
    { label: 'পেন্ডিং', value: pending, color: 'bg-purple-50 text-purple-800' },
    { label: 'এই মাসে সম্পন্ন', value: completedThisMonth, color: 'bg-green-50 text-green-800' },
  ]

  return <div>
    <div className="mb-7"><p className="text-sm font-semibold text-primary">লুভেভো টিউটর</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">ড্যাশবোর্ড</h1><p className="mt-2 text-gray-600">সব সার্ভিস রিকোয়েস্ট এক জায়গা থেকে পরিচালনা করুন।</p></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className={`rounded-xl p-5 shadow-sm ${card.color}`}><p className="text-sm font-semibold">{card.label}</p><p className="mt-2 text-3xl font-bold">{loading ? '—' : card.value}</p></div>)}</div>
    <section className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">সাম্প্রতিক ১০টি রিকোয়েস্ট</h2><span className="text-sm text-gray-500">সর্বশেষ আগে</span></div>{loading ? <p className="py-10 text-center text-gray-500">লোড হচ্ছে...</p> : rows.length === 0 ? <p className="py-10 text-center text-gray-500">এখনো কোনো রিকোয়েস্ট পাওয়া যায়নি</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="px-3 py-3">সার্ভিস</th><th className="px-3 py-3">নাম</th><th className="px-3 py-3">তারিখ</th><th className="px-3 py-3">স্ট্যাটাস</th></tr></thead><tbody>{rows.slice(0, 10).map((item, index) => { const status = REQUEST_STATUSES.find((value) => value.value === String(item.row.status ?? 'new')) ?? REQUEST_STATUSES[0]; return <tr key={`${item.key}-${String(item.row.id ?? index)}`} className="border-b last:border-0"><td className="px-3 py-4"><Link href={`/admin/${item.key}`} className="font-medium text-primary hover:underline">{item.label}</Link></td><td className="px-3 py-4">{getFirstValue(item.row, item.config.nameFields) || 'নাম নেই'}</td><td className="whitespace-nowrap px-3 py-4 text-gray-600">{formatDate(getFirstValue(item.row, item.config.dateFields))}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td></tr> })}</tbody></table></div>}</section>
  </div>
}
