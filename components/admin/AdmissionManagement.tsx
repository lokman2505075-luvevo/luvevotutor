'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { revalidateAdmissionConsultancy } from '../../app/actions'
import { supabase } from '../../lib/supabaseClient'

type University = {
  id: string
  name_bn: string
  name_en: string
  category: string
  college_code: string | null
  circular_date: string | null
  application_start: string | null
  application_end: string | null
  exam_date: string | null
  exam_center: string | null
  result: string | null
  status: string | null
  display_order: number
  is_active: boolean
}

type UniversityForm = Omit<University, 'id'>

const categories = [
  ['engineering', 'ইঞ্জিনিয়ারিং'],
  ['gst_cluster', 'GST ক্লাস্টার'],
  ['agriculture_cluster', 'কৃষি গুচ্ছ'],
  ['medical', 'মেডিকেল'],
  ['bds', 'BDS'],
  ['other_public', 'অন্যান্য পাবলিক'],
  ['national_university', 'জাতীয় বিশ্ববিদ্যালয়'],
  ['private', 'প্রাইভেট ভার্সিটি'],
] as const

const emptyForm: UniversityForm = {
  name_bn: '', name_en: '', category: 'engineering', college_code: '', circular_date: '',
  application_start: '', application_end: '', exam_date: '', exam_center: '', result: '',
  status: 'সার্কুলারের অপেক্ষায়', display_order: 0, is_active: true,
}

const fields: Array<[keyof UniversityForm, string]> = [
  ['name_bn', 'নাম (বাংলা)'], ['name_en', 'নাম (ইংরেজি)'], ['college_code', 'কলেজ কোড'],
  ['circular_date', 'সার্কুলার তারিখ'], ['application_start', 'আবেদন শুরু'], ['application_end', 'আবেদনের শেষ তারিখ'],
  ['exam_date', 'পরীক্ষার তারিখ'], ['exam_center', 'পরীক্ষার কেন্দ্র'], ['result', 'ফলাফল'], ['status', 'স্ট্যাটাস'],
]

function categoryLabel(value: string) {
  return categories.find(([key]) => key === value)?.[1] ?? value
}

export default function AdmissionManagement() {
  const [rows, setRows] = useState<University[]>([])
  const [category, setCategory] = useState('all')
  const [form, setForm] = useState<UniversityForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function loadUniversities() {
      const { data, error: queryError } = await supabase.from('universities').select('*').order('category').order('display_order').order('name_bn')
      if (queryError) setError(`তথ্য লোড করা যায়নি: ${queryError.message}`)
      else setRows((data ?? []) as University[])
      setLoading(false)
    }
    void loadUniversities()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(row: University) {
    setEditingId(row.id)
    setForm({ ...row })
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    if (!saving) setShowForm(false)
  }

  function updateField(field: keyof UniversityForm, value: string | number | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, display_order: Number(form.display_order) || 0 }
    const result = editingId
      ? await supabase.from('universities').update(payload).eq('id', editingId).select().single()
      : await supabase.from('universities').insert(payload).select().single()

    if (result.error) {
      setError(`সেভ করা যায়নি: ${result.error.message}`)
    } else if (result.data) {
      await revalidateAdmissionConsultancy()
      setRows((current) => editingId ? current.map((row) => row.id === editingId ? result.data as University : row) : [...current, result.data as University].sort((a, b) => a.category.localeCompare(b.category) || a.display_order - b.display_order))
      setShowForm(false)
      setToast(editingId ? 'তথ্য আপডেট হয়েছে' : 'নতুন তথ্য যোগ হয়েছে')
      window.setTimeout(() => setToast(''), 2200)
    }
    setSaving(false)
  }

  async function remove(row: University) {
    if (!window.confirm(`“${row.name_bn || row.name_en}” মুছে ফেলতে চান?`)) return
    setError('')
    const { error: deleteError } = await supabase.from('universities').delete().eq('id', row.id)
    if (deleteError) setError(`মুছে ফেলা যায়নি: ${deleteError.message}`)
    else {
      await revalidateAdmissionConsultancy()
      setRows((current) => current.filter((item) => item.id !== row.id))
      setToast('তথ্য মুছে ফেলা হয়েছে')
      window.setTimeout(() => setToast(''), 2200)
    }
  }

  const visibleRows = category === 'all' ? rows : rows.filter((row) => row.category === category)
  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

  return (
    <div className="relative rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {toast && <div className="fixed right-4 top-4 z-40 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">{toast}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
          <option value="all">সব ক্যাটাগরি</option>
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus size={17} />নতুন যোগ করুন</button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : visibleRows.length === 0 ? <p className="py-12 text-center text-slate-500">কোনো ভর্তি তথ্য পাওয়া যায়নি</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="px-3 py-3">নাম</th><th className="px-3 py-3">ক্যাটাগরি</th><th className="px-3 py-3">আবেদনের সময়</th><th className="px-3 py-3">স্ট্যাটাস</th><th className="px-3 py-3">ক্রম</th><th className="px-3 py-3">সক্রিয়</th><th className="px-3 py-3">অ্যাকশন</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-b align-top last:border-0"><td className="px-3 py-4"><p className="font-semibold text-blue-950">{row.name_bn}</p><p className="mt-1 text-xs text-slate-500">{row.name_en}</p>{row.college_code && <p className="mt-1 font-mono text-xs text-primary">{row.college_code}</p>}</td><td className="px-3 py-4">{categoryLabel(row.category)}</td><td className="px-3 py-4 text-slate-600">{row.application_start || '—'}<br />থেকে {row.application_end || '—'}</td><td className="px-3 py-4">{row.status || '—'}</td><td className="px-3 py-4">{row.display_order}</td><td className="px-3 py-4">{row.is_active ? <span className="text-green-700">হ্যাঁ</span> : <span className="text-slate-500">না</span>}</td><td className="px-3 py-4"><div className="flex gap-2"><button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-primary hover:bg-blue-100"><Pencil size={14} />এডিট</button><button type="button" onClick={() => void remove(row)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"><Trash2 size={14} />ডিলিট</button></div></td></tr>)}</tbody></table></div>}

      {showForm && <div className="fixed inset-0 z-30 overflow-y-auto bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="admission-form-title"><div className="mx-auto my-8 max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-7"><div className="flex items-center justify-between gap-4"><h2 id="admission-form-title" className="text-xl font-bold text-blue-950">{editingId ? 'ভর্তি তথ্য এডিট করুন' : 'নতুন ভর্তি তথ্য'}</h2><button type="button" onClick={closeForm} aria-label="ফর্ম বন্ধ করুন" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([field, label]) => <label key={field} className={field === 'name_bn' || field === 'name_en' ? 'sm:col-span-1' : ''}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input required={field === 'name_bn' || field === 'name_en'} value={String(form[field] ?? '')} onChange={(event) => updateField(field, event.target.value)} className={inputClass} /></label>)}<label><span className="mb-1.5 block text-sm font-semibold text-slate-700">ক্যাটাগরি</span><select value={form.category} onChange={(event) => updateField('category', event.target.value)} className={inputClass}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">প্রদর্শনের ক্রম</span><input type="number" min="0" value={form.display_order} onChange={(event) => updateField('display_order', Number(event.target.value))} className={inputClass} /></label><label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 sm:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 accent-blue-700" /><span className="text-sm font-semibold text-slate-700">সক্রিয় রাখুন</span></label><div className="flex justify-end gap-3 border-t pt-4 sm:col-span-2"><button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">বাতিল</button><button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</button></div></form></div></div>}
    </div>
  )
}