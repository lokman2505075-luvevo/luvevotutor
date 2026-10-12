'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { SUBJECTS } from '../../lib/subjects'
import { needsGuardianConfirmation, SOHOJATRI_INSTITUTION_TYPES, SOHOJATRI_LEVELS } from '../../lib/sohojatri'
import { supabase } from '../../lib/supabaseClient'

const WORK_TYPES = [
  ['assignment_guidance', 'অ্যাসাইনমেন্ট গাইড'],
  ['project', 'প্রজেক্ট'],
  ['presentation', 'প্রেজেন্টেশন'],
  ['research', 'রিসার্চ'],
  ['coding', 'কোডিং'],
  ['design', 'ডিজাইন'],
  ['translation', 'অনুবাদ'],
  ['proofreading', 'প্রুফরিডিং'],
  ['other', 'অন্যান্য'],
] as const

type HelperForm = {
  institution_type: string
  institution_name: string
  level: string
  skills: string[]
  work_types: string[]
  experience: string
  bio: string
  rate_min: string
  rate_max: string
  rate_negotiable: boolean
  availability: string
  portfolio_url: string
  guardian_confirmed: boolean
}

const EMPTY_FORM: HelperForm = {
  institution_type: '',
  institution_name: '',
  level: '',
  skills: [],
  work_types: [],
  experience: '',
  bio: '',
  rate_min: '',
  rate_max: '',
  rate_negotiable: true,
  availability: '',
  portfolio_url: '',
  guardian_confirmed: false,
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'
const statusLabels: Record<string, string> = {
  pending: 'অনুমোদনের অপেক্ষায়',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
  paused: 'এখন ব্যস্ত',
  suspended: 'স্থগিত',
}

export default function AssignmentHelperRegistration() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [form, setForm] = useState<HelperForm>(EMPTY_FORM)
  const [helperId, setHelperId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const guardianRequired = needsGuardianConfirmation(profile?.level, profile?.birth_date)

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error: loadError } = await supabase.from('assignment_helpers')
      .select('id,institution_type,institution_name,level,skills,work_types,experience,bio,rate_min,rate_max,rate_negotiable,availability,portfolio_url,guardian_confirmed,status,admin_note')
      .eq('user_id', user.id)
      .maybeSingle()
    if (loadError) setError(`হেল্পার প্রোফাইল লোড করা যায়নি: ${loadError.message}`)
    else if (data) {
      setHelperId(data.id)
      setStatus(data.status)
      setAdminNote(data.admin_note ?? '')
      setForm({
        institution_type: data.institution_type,
        institution_name: data.institution_name,
        level: data.level,
        skills: data.skills ?? [],
        work_types: data.work_types ?? [],
        experience: data.experience ?? '',
        bio: data.bio ?? '',
        rate_min: data.rate_min === null ? '' : String(data.rate_min),
        rate_max: data.rate_max === null ? '' : String(data.rate_max),
        rate_negotiable: data.rate_negotiable,
        availability: data.availability ?? '',
        portfolio_url: data.portfolio_url ?? '',
        guardian_confirmed: data.guardian_confirmed ?? false,
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void loadProfile() }, [loadProfile])

  function toggleValue(field: 'skills' | 'work_types', value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const { error: saveError } = await supabase.rpc('assignment_helper_save', {
      payload: {
        ...form,
        institution_name: form.institution_name.trim(),
        experience: form.experience.trim(),
        bio: form.bio.trim(),
        availability: form.availability.trim(),
        portfolio_url: form.portfolio_url.trim() || null,
        rate_min: form.rate_min,
        rate_max: form.rate_max,
        guardian_confirmed: form.guardian_confirmed,
      },
    })
    setSaving(false)
    if (saveError) {
      setError(`আবেদন জমা করা যায়নি: ${saveError.message}`)
      return
    }
    setStatus('pending')
    setAdminNote('')
    setNotice(helperId ? 'আপনার পরিবর্তন জমা হয়েছে; অনুমোদনের পর প্রোফাইল আবার দেখা যাবে।' : 'আপনার আবেদন যাচাইয়ের জন্য জমা হয়েছে।')
    await loadProfile()
  }

  async function toggleAvailability(paused: boolean) {
    setError('')
    setNotice('')
    const { error: updateError } = await supabase.rpc('assignment_helper_set_paused', { is_paused: paused })
    if (updateError) {
      setError(`অবস্থা পরিবর্তন করা যায়নি: ${updateError.message}`)
      return
    }
    setStatus(paused ? 'paused' : 'approved')
    setNotice(paused ? 'আপনার প্রোফাইল এখন তালিকায় দেখা যাবে না।' : 'আপনার প্রোফাইল আবার তালিকায় প্রকাশিত হয়েছে।')
  }

  if (loading) return <div className="animate-pulse rounded-2xl bg-white p-8 shadow-sm"><div className="h-5 w-48 rounded bg-gray-200" /><div className="mt-5 h-32 rounded bg-gray-100" /></div>

  return <section className="mx-auto max-w-3xl">
    <h2 className="text-2xl font-bold text-blue-950 md:text-3xl">আপনি কি অ্যাসাইনমেন্ট/প্রজেক্টে সাহায্য করতে পারেন?</h2>
    <p className="mt-2 text-gray-600">আপনার দক্ষতা অন্যদের কাজে লাগান এবং নিজের অভিজ্ঞতা তৈরি করুন।</p>
    {!user ? <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <p className="text-gray-700">হেল্পার হিসেবে যুক্ত হতে লগইন করুন।</p>
      <button type="button" onClick={() => router.push('/login')} className="mt-4 rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600">লগইন করুন</button>
    </div> : <>
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        <p><strong>প্রোফাইলের নাম:</strong> {profile?.full_name || 'প্রোফাইলে নাম যোগ করুন'}</p>
        <p className="mt-1"><strong>প্রোফাইলে সংরক্ষিত ফোন:</strong> {profile?.phone ? 'সংরক্ষিত আছে (শুধু আপনার কাছে দৃশ্যমান)' : 'যোগ করা নেই'}</p>
      </div>
      {status && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">অবস্থা: {statusLabels[status] ?? status}{adminNote ? ` · কারণ: ${adminNote}` : ''}</p>}
      {status === 'approved' && <button type="button" onClick={() => void toggleAvailability(true)} className="mt-4 rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900">এখন ব্যস্ত</button>}
      {status === 'paused' && <button type="button" onClick={() => void toggleAvailability(false)} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600">আবার উপলব্ধ</button>}

      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
        <h3 className="text-lg font-bold text-blue-950 md:col-span-2">{helperId ? 'হেল্পার প্রোফাইল সম্পাদনা' : 'হেল্পার হিসেবে নিবন্ধন'}</h3>
        <label className="text-sm text-gray-700">প্রতিষ্ঠানের ধরন *
          <select required value={form.institution_type} onChange={(event) => setForm({ ...form, institution_type: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="">নির্বাচন করুন</option>{SOHOJATRI_INSTITUTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">প্রতিষ্ঠানের নাম *
          <input required maxLength={160} value={form.institution_name} onChange={(event) => setForm({ ...form, institution_name: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm text-gray-700 md:col-span-2">স্তর / বিভাগ *
          <select required value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className={`${inputClass} mt-1`}>
            <option value="">নির্বাচন করুন</option>{SOHOJATRI_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-gray-700">যে বিষয় / দক্ষতায় সাহায্য করতে পারেন *</legend>
          <div className="mt-2 flex flex-wrap gap-2">{SUBJECTS.map((subject) => <label key={subject} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${form.skills.includes(subject) ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
            <input type="checkbox" checked={form.skills.includes(subject)} onChange={() => toggleValue('skills', subject)} className="sr-only" />{subject}
          </label>)}</div>
        </fieldset>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-gray-700">কাজের ধরন *</legend>
          <div className="mt-2 flex flex-wrap gap-2">{WORK_TYPES.map(([value, text]) => <label key={value} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${form.work_types.includes(value) ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
            <input type="checkbox" checked={form.work_types.includes(value)} onChange={() => toggleValue('work_types', value)} className="sr-only" />{text}
          </label>)}</div>
        </fieldset>
        <label className="text-sm text-gray-700 md:col-span-2">অভিজ্ঞতা
          <textarea maxLength={1000} rows={2} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm text-gray-700 md:col-span-2">সংক্ষিপ্ত পরিচয় *
          <textarea required maxLength={2000} rows={4} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm text-gray-700">আনুমানিক সর্বনিম্ন রেট (ঐচ্ছিক)
          <input type="number" min="0" step="1" value={form.rate_min} onChange={(event) => setForm({ ...form, rate_min: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm text-gray-700">আনুমানিক সর্বোচ্চ রেট (ঐচ্ছিক)
          <input type="number" min="0" step="1" value={form.rate_max} onChange={(event) => setForm({ ...form, rate_max: event.target.value })} className={`${inputClass} mt-1`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
          <input type="checkbox" checked={form.rate_negotiable} onChange={(event) => setForm({ ...form, rate_negotiable: event.target.checked })} /> আলোচনা সাপেক্ষ
        </label>
        <label className="text-sm text-gray-700 md:col-span-2">কখন available *
          <input required maxLength={500} value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })} placeholder="যেমন: সপ্তাহের সন্ধ্যায়" className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm text-gray-700 md:col-span-2">পোর্টফোলিও / sample link (ঐচ্ছিক)
          <input type="url" maxLength={500} value={form.portfolio_url} onChange={(event) => setForm({ ...form, portfolio_url: event.target.value })} placeholder="https://" className={`${inputClass} mt-1`} />
        </label>
        {guardianRequired && <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2"><input required type="checkbox" checked={form.guardian_confirmed} onChange={(event) => setForm({ ...form, guardian_confirmed: event.target.checked })} className="mt-1" /><span>আমি অভিভাবককে জানিয়েছি এবং তাঁর সম্মতি পেয়েছি। আমার ফোন/ইমেইল কোনো পাবলিক তালিকায় দেখানো হবে না।</span></label>}
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">পরীক্ষায় নকল, অন্যের হয়ে জমা দেওয়ার মতো কাজ করা যাবে না। হেল্পার গাইডেন্স, রিভিউ ও শেখানোর জন্য। ভুয়া সনদ, plagiarism-as-service ও বেআইনি কাজ নিষিদ্ধ। অগ্রিম টাকা পাঠাবেন না, সন্দেহ হলে রিপোর্ট করুন।</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700 md:col-span-2">{notice}</p>}
        <button disabled={saving || form.skills.length === 0 || form.work_types.length === 0 || (guardianRequired && !form.guardian_confirmed)} type="submit" className="rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 md:w-fit">{saving ? 'জমা হচ্ছে...' : 'যাচাইয়ের জন্য জমা দিন'}</button>
      </form>
    </>}
  </section>
}
