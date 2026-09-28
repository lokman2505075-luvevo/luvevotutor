"use client"

import { useState, type FormEvent } from 'react'
import { DISTRICTS, DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import { supabase } from '../../lib/supabaseClient'

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100'

type Props = { tutor?: { id: string; name: string } | null; onClose?: () => void }

export default function TutorRequestForm({ tutor, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [district, setDistrict] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (website) return
    setError('')
    if (!name.trim() || !phone.trim() || !classLevel.trim() || !subject || !district) return setError('নাম, ফোন, ক্লাস, বিষয় ও জেলা পূরণ করুন')
    if (message.length > 500) return setError('বার্তা ৫০০ অক্ষরের মধ্যে রাখুন')
    setSubmitting(true)
    const districtLabel = DISTRICTS.find((item) => item.value === district)?.label ?? district
    const selectedTutor = tutor ? `নির্বাচিত টিউটর: ${tutor.name} (ID: ${tutor.id})` : 'নির্বাচিত টিউটর: নেই'
    const details = [
      `এলাকা/জেলা: ${districtLabel}`,
      `পছন্দের সময়: ${preferredTime || 'উল্লেখ নেই'}`,
      `অতিরিক্ত বার্তা: ${message.trim() || 'নেই'}`,
      selectedTutor,
    ].join('\n')
    const { error: insertError } = await supabase.from('live_tuition_bookings').insert({
      name: name.trim(),
      phone: phone.trim(),
      subject,
      class_level: classLevel.trim(),
      preferred_time: preferredTime.trim() || null,
      budget: budget.trim() || null,
      details,
    })
    setSubmitting(false)
    if (insertError) return setError('রিকোয়েস্ট জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।')
    setSubmitted(true)
  }

  if (submitted) return <div className="rounded-2xl bg-green-50 p-8 text-center" aria-live="polite"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div><h2 className="mt-4 text-xl font-bold text-green-900">আপনার রিকোয়েস্ট জমা হয়েছে।</h2><p className="mt-2 text-sm leading-7 text-green-800">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব। নিশ্চিত করার পর Luvevo আপনার সঙ্গে টিউটরের যোগাযোগের তথ্য শেয়ার করবে।</p>{onClose && <button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">বন্ধ করুন</button>}</div>

  return <form onSubmit={handleSubmit} className="space-y-5" noValidate>
    {tutor && <p className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-primary">নির্বাচিত টিউটর: {tutor.name}</p>}
    <div className="grid gap-5 sm:grid-cols-2"><Field label="অভিভাবক/স্টুডেন্টের নাম" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /><Field label="ফোন" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /><Field label="ক্লাস/লেভেল" name="class_level" value={classLevel} onChange={(event) => setClassLevel(event.target.value)} required /><div><label htmlFor="request-subject" className="mb-2 block text-sm font-semibold">বিষয়</label><select id="request-subject" required value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass}><option value="">বিষয় নির্বাচন করুন</option>{SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select></div></div>
    <div><label htmlFor="request-district" className="mb-2 block text-sm font-semibold">এলাকা/জেলা</label><select id="request-district" required value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClass}><option value="">জেলা নির্বাচন করুন</option>{DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>{districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="পছন্দের সময় (ঐচ্ছিক)" name="preferred_time" value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} /><Field label="বাজেট (ঐচ্ছিক)" name="budget" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value)} /></div>
    <div><label htmlFor="request-message" className="mb-2 block text-sm font-semibold">বার্তা (ঐচ্ছিক)</label><textarea id="request-message" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} min-h-28`} /><p className="mt-1 text-right text-xs text-slate-500">{message.length}/500</p></div>
    <div className="absolute -left-[9999px]" aria-hidden="true"><label htmlFor="website">ওয়েবসাইট</label><input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert" aria-live="polite">{error}</p>}
    <button type="submit" disabled={submitting} className="min-h-11 w-full rounded-xl bg-accent px-5 py-3 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'জমা হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}</button>
  </form>
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div><label htmlFor={props.id ?? props.name} className="mb-2 block text-sm font-semibold">{label}</label><input id={props.id ?? props.name} className={inputClass} {...props} /></div>
}
