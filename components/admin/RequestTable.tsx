'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink, Search, X } from 'lucide-react'
import { DISTRICTS } from '@/lib/districts'
import AdmissionRequestDetails from './AdmissionRequestDetails'
import { fetchRequestRows, formatDate, getFirstValue, getRowDate, toCsv, updateRequest, type RequestRow } from './adminData'
import { REQUEST_STATUSES, type RequestConfig } from './requestConfig'

const PAGE_SIZE = 20

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function displayFieldLabel(key: string) {
  if (key === 'ssc_gpa') return 'SSC GPA'
  if (key === 'hsc_gpa') return 'HSC GPA'
  return key
}

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return digits
  if (digits.startsWith('0')) return `88${digits}`
  return `880${digits}`
}

export default function RequestTable({ config }: { config: RequestConfig }) {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [district, setDistrict] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RequestRow | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    setRows([])
    setSelected(null)
    setLoading(true)
    setError('')

    async function load() {
      const result = await fetchRequestRows(config)
      if (result.error) setError('রিকোয়েস্টগুলো লোড করা যায়নি')
      else setRows(result.data)
      setLoading(false)
    }

    void load()
  }, [config])

  const filteredRows = rows
    .filter((row) => {
      const text = `${getFirstValue(row, config.nameFields)} ${getFirstValue(row, config.phoneFields)} ${JSON.stringify(row)}`.toLowerCase()
      const matchesSearch = !search.trim() || text.includes(search.trim().toLowerCase())
      const matchesStatus = status === 'all' || String(row.status ?? 'new') === status
      const rowDistrict = getFirstValue(row, config.districtFields)
      const matchesDistrict = district === 'all' || rowDistrict === district
      return matchesSearch && matchesStatus && matchesDistrict
    })
    .sort((first, second) => getRowDate(second, config) - getRowDate(first, config))

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const districts = Array.from(new Set(rows.map((row) => getFirstValue(row, config.districtFields)).filter(Boolean)))

  function openDetails(row: RequestRow) {
    setSelected(row)
    setNote(String(row.admin_note ?? ''))
  }

  async function changeStatus(value: string) {
    if (!selected?.id) return
    const { error: updateError } = await updateRequest(selected.id, { status: value }, config)
    if (updateError) {
      setError('স্ট্যাটাস সংরক্ষণ করা যায়নি')
      return
    }
    const updated = { ...selected, status: value }
    setSelected(updated)
    setRows((current) => current.map((row) => row.id === selected.id ? updated : row))
  }

  async function saveNote() {
    if (!selected?.id) return
    setSavingNote(true)
    const { error: updateError } = await updateRequest(selected.id, { admin_note: note }, config)
    if (updateError) setError('নোট সংরক্ষণ করা যায়নি')
    else {
      const updated = { ...selected, admin_note: note }
      setSelected(updated)
      setRows((current) => current.map((row) => row.id === selected.id ? updated : row))
    }
    setSavingNote(false)
  }

  function exportCsv() {
    const blob = new Blob([`\uFEFF${toCsv(filteredRows)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${config.key}-requests.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!config.table) return <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">এই সেবার কোনো database request table এখনো নেই।</div>

  return <>
    <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="নাম বা ফোন দিয়ে খুঁজুন" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 outline-none focus:border-primary" /></div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="rounded-lg border border-gray-300 px-3 py-2"><option value="all">সব স্ট্যাটাস</option>{REQUEST_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={district} onChange={(event) => { setDistrict(event.target.value); setPage(1) }} className="rounded-lg border border-gray-300 px-3 py-2"><option value="all">সব জেলা</option>{districts.map((value) => <option key={value} value={value}>{DISTRICTS.find((item) => item.value === value)?.label ?? value}</option>)}</select>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"><Download size={16} /> CSV</button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="py-16 text-center text-gray-500">লোড হচ্ছে...</div> : visibleRows.length === 0 ? <div className="py-16 text-center text-gray-500">এই ফিল্টারে কোনো রিকোয়েস্ট পাওয়া যায়নি</div> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-gray-500"><th className="px-3 py-3">তারিখ</th><th className="px-3 py-3">নাম</th><th className="px-3 py-3">ফোন</th><th className="px-3 py-3">বিস্তারিত</th><th className="px-3 py-3">স্ট্যাটাস</th></tr></thead><tbody>{visibleRows.map((row, index) => { const rowStatus = REQUEST_STATUSES.find((item) => item.value === String(row.status ?? 'new')) ?? REQUEST_STATUSES[0]; return <tr key={String(row.id ?? index)} onClick={() => openDetails(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(row) }} className="cursor-pointer border-b last:border-0 hover:bg-blue-50"><td className="whitespace-nowrap px-3 py-4 text-gray-600">{formatDate(getFirstValue(row, config.dateFields))}</td><td className="px-3 py-4 font-medium">{getFirstValue(row, config.nameFields) || 'নাম নেই'}</td><td className="whitespace-nowrap px-3 py-4 text-gray-600">{getFirstValue(row, config.phoneFields) || '—'}</td><td className="max-w-xs px-3 py-4 text-gray-600">{Object.entries(row).filter(([key]) => !['id', 'status', 'admin_note', 'assigned_to', 'updated_at', 'created_at', ...config.nameFields, ...config.phoneFields].includes(key)).slice(0, 3).map(([key, value]) => `${key}: ${displayValue(value)}`).join(' · ') || '—'}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rowStatus.className}`}>{rowStatus.label}</span></td></tr> })}</tbody></table></div>}

      {pageCount > 1 && <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm"><span className="text-gray-500">মোট {filteredRows.length}টি</span><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">আগের</button><span>{page} / {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">পরের</button></div></div>}
    </div>

    {selected && <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-primary">রিকোয়েস্টের বিস্তারিত</h2><button type="button" onClick={() => setSelected(null)} aria-label="বন্ধ করুন" className="rounded p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button></div>{config.key === 'admission' ? <AdmissionRequestDetails row={selected} /> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{Object.entries(selected).map(([key, value]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">{displayFieldLabel(key)}</div><div className="mt-1 break-words text-sm font-medium">{displayValue(value)}</div></div>)}</div>}<div className="mt-6"><label className="mb-2 block text-sm font-semibold">স্ট্যাটাস</label><select value={String(selected.status ?? 'new')} onChange={(event) => void changeStatus(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="new">নতুন</option><option value="contacted">যোগাযোগ হয়েছে</option><option value="in_progress">চলমান</option><option value="completed">সম্পন্ন</option><option value="cancelled">বাতিল</option></select></div><div className="mt-5"><label className="mb-2 block text-sm font-semibold">অ্যাডমিন নোট</label><textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-28 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-primary" /><button type="button" disabled={savingNote} onClick={() => void saveNote()} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingNote ? 'সংরক্ষণ হচ্ছে...' : 'নোট সংরক্ষণ করুন'}</button></div><div className="mt-6 flex flex-wrap gap-3">{getFirstValue(selected, config.phoneFields) && <><a href={`tel:${getFirstValue(selected, config.phoneFields)}`} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">কল করুন</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(getFirstValue(selected, config.phoneFields))}`} className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white"><ExternalLink size={16} /> WhatsApp</a></>}</div></aside></div>}
  </>
}
