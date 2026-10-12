'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { SOHOJATRI_INSTITUTION_TYPES, SOHOJATRI_LEVELS, toBengaliDigits } from '../../lib/sohojatri'

type Helper = {
  id: string
  user_id: string
  full_name: string
  institution_type: string
  institution_name: string
  level: string
  skills: string[]
  work_types: string[]
  experience: string
  bio: string
  rate_min: number | null
  rate_max: number | null
  rate_negotiable: boolean
  availability: string
  portfolio_url: string | null
  status: string
  admin_note: string | null
  created_at: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'paused' | 'suspended' | 'rejected'
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'
const statusLabels: Record<string, string> = {
  pending: 'অনুমোদনের অপেক্ষায়',
  approved: 'অনুমোদিত',
  paused: 'এখন ব্যস্ত',
  suspended: 'স্থগিত',
  rejected: 'প্রত্যাখ্যাত',
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

export default function AssignmentHelpersAdmin() {
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [editing, setEditing] = useState<Helper | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('assignment_helper_admin_directory')
      .select('*').order('created_at', { ascending: false }).limit(1000)
    if (loadError) setError(`হেল্পার তালিকা লোড করা যায়নি: ${loadError.message}`)
    else setHelpers((data ?? []) as Helper[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleHelpers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return helpers.filter((helper) =>
      (statusFilter === 'all' || helper.status === statusFilter)
      && (!query || `${helper.full_name} ${helper.institution_name} ${helper.skills.join(' ')}`.toLocaleLowerCase().includes(query))
    )
  }, [helpers, search, statusFilter])

  async function manage(helper: Helper, action: 'approve' | 'reject' | 'suspend' | 'unsuspend' | 'delete') {
    let reason = ''
    if (action === 'reject') {
      reason = window.prompt('প্রত্যাখ্যানের কারণ লিখুন')?.trim() ?? ''
      if (!reason) return
    } else if (action === 'suspend') {
      reason = window.prompt('স্থগিত করার কারণ লিখুন')?.trim() ?? ''
      if (!reason) return
    }
    if (action === 'delete' && !window.confirm('হেল্পার প্রোফাইল ও সংশ্লিষ্ট তথ্য মুছে যাবে। চালিয়ে যাবেন?')) return
    setSavingId(helper.id)
    setError('')
    setNotice('')
    const { error: actionError } = await supabase.rpc('assignment_helper_admin_manage', {
      target_helper_id: helper.id,
      action,
      reason,
    })
    setSavingId('')
    if (actionError) {
      setError(`হেল্পার আপডেট করা যায়নি: ${actionError.message}`)
      return
    }
    setNotice('হেল্পার প্রোফাইল হালনাগাদ হয়েছে')
    await load()
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    setSavingId(editing.id)
    setError('')
    const { error: updateError } = await supabase.rpc('assignment_helper_admin_update', {
      target_helper_id: editing.id,
      payload: {
        institution_name: form.get('institution_name'),
        bio: form.get('bio'),
        experience: form.get('experience'),
        availability: form.get('availability'),
      },
    })
    setSavingId('')
    if (updateError) {
      setError(`প্রোফাইল সম্পাদনা করা যায়নি: ${updateError.message}`)
      return
    }
    setEditing(null)
    setNotice('হেল্পার প্রোফাইল সম্পাদনা হয়েছে; পরিবর্তিত বিবরণ পুনরায় অনুমোদনের অপেক্ষায়।')
    await load()
  }

  return <section className="space-y-5">
    <header>
      <h1 className="text-2xl font-bold text-blue-950">হেল্পার পরিচালনা</h1>
      <p className="mt-1 text-sm text-gray-600">আবেদন অনুমোদন, প্রোফাইল অনুসন্ধান ও হেল্পার অবস্থা পরিচালনা করুন।</p>
    </header>
    <div className="flex flex-col gap-3 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="নাম, প্রতিষ্ঠান বা বিষয় দিয়ে খুঁজুন" className={inputClass} />
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={inputClass}>
        <option value="pending">অনুমোদনের অপেক্ষায়</option><option value="all">সব অবস্থা</option>
        <option value="approved">অনুমোদিত</option><option value="paused">এখন ব্যস্ত</option>
        <option value="suspended">স্থগিত</option><option value="rejected">প্রত্যাখ্যাত</option>
      </select>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {editing && <form onSubmit={saveEdit} className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-5 md:grid-cols-2">
      <h2 className="font-bold text-blue-950 md:col-span-2">{editing.full_name} — প্রোফাইল সম্পাদনা</h2>
      <label className="text-sm text-gray-700">প্রতিষ্ঠান<input name="institution_name" required maxLength={160} defaultValue={editing.institution_name} className={`${inputClass} mt-1`} /></label>
      <p className="self-end text-sm text-gray-600">{optionLabel(SOHOJATRI_INSTITUTION_TYPES, editing.institution_type)} · {optionLabel(SOHOJATRI_LEVELS, editing.level)}</p>
      <label className="text-sm text-gray-700 md:col-span-2">সংক্ষিপ্ত পরিচয়<textarea name="bio" required maxLength={2000} defaultValue={editing.bio} rows={3} className={`${inputClass} mt-1`} /></label>
      <label className="text-sm text-gray-700">অভিজ্ঞতা<textarea name="experience" maxLength={1000} defaultValue={editing.experience} rows={2} className={`${inputClass} mt-1`} /></label>
      <label className="text-sm text-gray-700">কখন available<input name="availability" maxLength={500} defaultValue={editing.availability} className={`${inputClass} mt-1`} /></label>
      <div className="flex gap-2 md:col-span-2"><button disabled={savingId === editing.id} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">সংরক্ষণ</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2">বাতিল</button></div>
    </form>}
    {loading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="animate-pulse rounded-xl bg-gray-100 p-6"><div className="h-4 w-1/2 rounded bg-gray-200" /><div className="mt-4 h-16 rounded bg-gray-200" /></div>)}</div>
      : visibleHelpers.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-gray-600">এই ফিল্টারে কোনো হেল্পার নেই।</p>
        : <div className="grid gap-4 md:grid-cols-2">{visibleHelpers.map((helper) => <article key={helper.id} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-blue-950">{helper.full_name}</h2><p className="mt-1 text-sm text-gray-600">{optionLabel(SOHOJATRI_INSTITUTION_TYPES, helper.institution_type)} · {helper.institution_name} · {optionLabel(SOHOJATRI_LEVELS, helper.level)}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{statusLabels[helper.status] ?? helper.status}</span></div>
          <p className="mt-3 text-sm text-gray-700">দক্ষতা: {helper.skills.join(' · ')}</p><p className="mt-1 text-sm text-gray-600">{helper.bio}</p>
          {helper.admin_note && <p className="mt-2 text-sm text-red-700">অ্যাডমিন নোট: {helper.admin_note}</p>}
          <p className="mt-2 text-xs text-gray-500">জমা: {toBengaliDigits(new Date(helper.created_at).toLocaleDateString('bn-BD'))}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {helper.status === 'pending' && <><button disabled={savingId === helper.id} onClick={() => void manage(helper, 'approve')} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">অনুমোদন</button><button disabled={savingId === helper.id} onClick={() => void manage(helper, 'reject')} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">প্রত্যাখ্যান</button></>}
            {['approved', 'paused', 'suspended', 'rejected'].includes(helper.status) && <button type="button" onClick={() => setEditing(helper)} className="rounded-lg border border-primary px-3 py-2 text-sm text-primary">সম্পাদনা</button>}
            {['approved', 'paused'].includes(helper.status) && <button disabled={savingId === helper.id} onClick={() => void manage(helper, 'suspend')} className="rounded-lg border border-amber-400 px-3 py-2 text-sm text-amber-900 disabled:opacity-50">স্থগিত</button>}
            {helper.status === 'suspended' && <button disabled={savingId === helper.id} onClick={() => void manage(helper, 'unsuspend')} className="rounded-lg border border-green-300 px-3 py-2 text-sm text-green-800 disabled:opacity-50">স্থগিত তুলে নিন</button>}
            <button disabled={savingId === helper.id} onClick={() => void manage(helper, 'delete')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">মুছুন</button>
          </div>
        </article>)}</div>}
  </section>
}
