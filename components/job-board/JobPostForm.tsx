'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { LEVELS } from '../../lib/levels'
import { SUBJECTS } from '../../lib/subjects'
import { normalizeDigits } from '../../lib/jobBoard'
import { supabase } from '../../lib/supabaseClient'

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100'

export default function JobPostForm({ initialName = '', initialPhone = '' }: { initialName?: string; initialPhone?: string }) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [district, setDistrict] = useState('')
  const [locality, setLocality] = useState('')
  const [salary, setSalary] = useState('')
  const [days, setDays] = useState('')
  const [details, setDetails] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (initialName && !name) setName(initialName)
    if (initialPhone && !phone) setPhone(initialPhone)
  }, [initialName, initialPhone, name, phone])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (website) return
    setError('')
    const numericSalary = Number(normalizeDigits(salary).replace(/[০-৯,٬]/g, (digit) => digit === ',' || digit === '٬' ? '' : String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).trim())
    const numericDays = Number(normalizeDigits(days).trim())
    if (!name.trim() || !phone.trim() || !subject || !level || !district || !locality.trim()) return setError('নাম, ফোন, বিষয়, লেভেল, জেলা ও এলাকা পূরণ করুন')
    if (!Number.isFinite(numericSalary) || numericSalary < 500 || numericSalary > 100000) return setError('বেতন ৫০০ থেকে ১,০০,০০০ টাকার মধ্যে দিন')
    if (!Number.isInteger(numericDays) || numericDays < 1 || numericDays > 7) return setError('সপ্তাহে ১ থেকে ৭ দিন নির্বাচন করুন')
    if (details.length > 500) return setError('অতিরিক্ত বিবরণ ৫০০ অক্ষরের মধ্যে রাখুন')
    setSubmitting(true)
    const title = `${subject} টিউটর প্রয়োজন – ${level}`
    const { error: insertError } = await supabase.from('job_posts').insert({ title, subject, class_level: level, district, locality: locality.trim(), area: locality.trim(), salary: numericSalary, days_per_week: numericDays, details: details.trim() || null, contact_name: name.trim(), contact_phone: phone.trim() })
    setSubmitting(false)
    if (insertError) return setError('পোস্ট জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।')
    setSubmitted(true)
  }

  if (submitted) return <div className="rounded-2xl bg-green-50 p-8 text-center text-green-900" aria-live="polite"><h2 className="text-2xl font-bold">আপনার পোস্ট জমা হয়েছে।</h2><p className="mt-3 leading-7">যাচাইয়ের পর জব বোর্ডে দেখা যাবে।</p></div>

  return <form onSubmit={handleSubmit} className="space-y-5" noValidate><div className="grid gap-5 sm:grid-cols-2"><Field label="নাম" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /><Field label="ফোন" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /><SelectField label="বিষয়" value={subject} onChange={setSubject} options={SUBJECTS} placeholder="বিষয় নির্বাচন করুন" /><SelectField label="লেভেল" value={level} onChange={setLevel} options={LEVELS} placeholder="লেভেল নির্বাচন করুন" /></div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="job-district" className="mb-2 block text-sm font-semibold text-slate-700">জেলা</label><select id="job-district" required value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClass}><option value="">জেলা নির্বাচন করুন</option>{DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>{districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></div><Field label="এলাকা/ঠিকানা" name="locality" value={locality} onChange={(event) => setLocality(event.target.value)} /></div><div className="grid gap-5 sm:grid-cols-2"><Field label="প্রস্তাবিত বেতন (৳/মাস)" name="salary" inputMode="numeric" value={salary} onChange={(event) => setSalary(event.target.value)} /><div><label htmlFor="job-days" className="mb-2 block text-sm font-semibold text-slate-700">সপ্তাহে কতদিন</label><select id="job-days" required value={days} onChange={(event) => setDays(event.target.value)} className={inputClass}><option value="">দিন নির্বাচন করুন</option>{[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day} দিন</option>)}</select></div></div><div><label htmlFor="job-details" className="mb-2 block text-sm font-semibold text-slate-700">অতিরিক্ত বিবরণ (ঐচ্ছিক)</label><textarea id="job-details" maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} className={`${inputClass} min-h-32`} /><p className="mt-1 text-xs text-slate-500">ফোন নম্বর বা ব্যক্তিগত তথ্য লিখবেন না <span className="float-right">{details.length}/500</span></p></div><div className="absolute -left-[9999px]" aria-hidden="true"><label htmlFor="job-website">ওয়েবসাইট</label><input id="job-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}<button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><LoaderCircle size={18} className="animate-spin" /> জমা হচ্ছে...</> : 'পোস্ট জমা দিন'}</button></form>
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div><label htmlFor={props.id ?? props.name} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><input id={props.id ?? props.name} required className={inputClass} {...props} /></div>
}

function SelectField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string }) {
  return <div><label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><select required value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>
}
