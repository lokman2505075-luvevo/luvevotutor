"use client"

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import { supabase } from '../../lib/supabaseClient'

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100'
const steps = ['ব্যক্তিগত তথ্য', 'পাঠদান তথ্য', 'অ্যাকাউন্ট']

function normalizeDigits(value: string) {
  return value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
}

export default function RegistrationWizard() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [qualification, setQualification] = useState('এসএসসি')
  const [subjects, setSubjects] = useState<string[]>([])
  const [district, setDistrict] = useState('')
  const [experience, setExperience] = useState('')
  const [fee, setFee] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  function toggleSubject(subject: string) {
    setSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject])
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!name.trim() || !phone.trim() || !email.trim()) return 'নাম, ফোন ও ইমেইল পূরণ করুন'
      if (!/^\S+@\S+\.\S+$/.test(email)) return 'সঠিক ইমেইল ঠিকানা দিন'
    }
    if (step === 1) {
      if (subjects.length === 0) return 'কমপক্ষে একটি বিষয় নির্বাচন করুন'
      if (!district) return 'জেলা নির্বাচন করুন'
      if (shortBio.length > 500) return 'সংক্ষিপ্ত পরিচিতি ৫০০ অক্ষরের মধ্যে রাখুন'
    }
    if (step === 2) {
      if (password.length < 6) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন'
      if (password !== confirmPassword) return 'পাসওয়ার্ড দুটো একই নয়'
      if (!consent) return 'রেজিস্ট্রেশন চালিয়ে যেতে সম্মতি দিন'
    }
    return ''
  }

  function nextStep() {
    const validationError = validateCurrentStep()
    setError(validationError)
    if (!validationError) setStep((current) => Math.min(current + 1, 2))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateCurrentStep()
    if (validationError) return setError(validationError)
    setError('')
    setSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          role: 'tutor',
          subjects,
          district,
          short_bio: shortBio.trim().slice(0, 500),
        },
      },
    })
    setSubmitting(false)
    if (signUpError || !data.user) return setError(signUpError?.message ?? 'আবেদন পাঠানো যায়নি')
    setNeedsEmailConfirmation(!data.session)
    setSubmitted(true)
  }

  if (submitted) return <section className="rounded-2xl border border-green-100 bg-white p-8 text-center shadow-xl shadow-blue-950/5 sm:p-12" aria-live="polite"><div className="mx-auto flex h-20 w-20 animate-check items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={46} /></div><h2 className="mt-6 text-2xl font-bold text-blue-950 sm:text-3xl">আপনার আবেদন জমা হয়েছে।</h2><p className="mx-auto mt-3 max-w-xl leading-8 text-slate-600">অনুমোদনের পর আপনার প্রোফাইল হোমপেজে দেখা যাবে।</p>{needsEmailConfirmation && <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-primary">আপনার ইমেইলে একটি নিশ্চিতকরণ লিংক পাঠানো হয়েছে। ইনবক্স দেখে ইমেইলটি নিশ্চিত করুন।</p>}</section>

  const strength = password.length < 6 ? 0 : password.length < 8 ? 1 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 3 : 2
  const strengthLabel = ['পাসওয়ার্ডের শক্তি', 'দুর্বল', 'মাঝারি', 'শক্তিশালী'][strength]

  return <section className="rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
    <div className="border-b border-slate-100 p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-bold text-amber-600">আপনার যাত্রার প্রথম ধাপ</p><h2 className="mt-1 text-2xl font-bold text-blue-950 sm:text-3xl">টিউটর রেজিস্ট্রেশন</h2></div><span className="text-sm font-semibold text-slate-500">ধাপ {step + 1} / 3</span></div><div className="mt-6 flex gap-2">{steps.map((label, index) => <div key={label} className="flex-1"><div className={`h-2 rounded-full ${index <= step ? 'bg-primary' : 'bg-slate-100'}`} /><p className={`mt-2 text-xs font-semibold sm:text-sm ${index === step ? 'text-primary' : 'text-slate-400'}`}>{label}</p></div>)}</div></div>
    <form onSubmit={handleSubmit} className="p-6 sm:p-8">
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2"><Field label="নাম" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /><Field label="ফোন নাম্বার" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /><Field label="ইমেইল" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="sm:col-span-2" /></div>}
      {step === 1 && <div className="space-y-6"><div><label htmlFor="qualification" className="mb-2 block text-sm font-semibold text-slate-700">শিক্ষাগত যোগ্যতা</label><select id="qualification" value={qualification} onChange={(event) => setQualification(event.target.value)} className={inputClass}><option>এসএসসি</option><option>এইচএসসি</option><option>অনার্স</option><option>মাস্টার্স</option></select></div><fieldset><legend className="mb-2 block text-sm font-semibold text-slate-700">পড়াতে পারেন এমন বিষয় <span className="text-red-600">*</span></legend><div className="flex flex-wrap gap-2">{SUBJECTS.map((subject) => <button type="button" key={subject} aria-pressed={subjects.includes(subject)} onClick={() => toggleSubject(subject)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${subjects.includes(subject) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'}`}>{subject}</button>)}</div></fieldset><div><label htmlFor="district" className="mb-2 block text-sm font-semibold text-slate-700">জেলা <span className="text-red-600">*</span></label><select id="district" required value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClass}><option value="">জেলা নির্বাচন করুন</option>{DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>{districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></div><div className="grid gap-5 sm:grid-cols-2"><Field label="অভিজ্ঞতা (বছর)" name="experience" type="tel" inputMode="numeric" autoComplete="off" value={experience} onChange={(event) => setExperience(normalizeDigits(event.target.value))} /><Field label="প্রত্যাশিত ফি / মাস (৳)" name="expected-fee" type="tel" inputMode="numeric" autoComplete="off" value={fee} onChange={(event) => setFee(normalizeDigits(event.target.value))} /></div><div><label htmlFor="short-bio" className="mb-2 block text-sm font-semibold text-slate-700">সংক্ষিপ্ত পরিচিতি</label><textarea id="short-bio" name="short_bio" maxLength={500} value={shortBio} onChange={(event) => setShortBio(event.target.value)} className={`${inputClass} min-h-32`} /><p className="mt-1 text-right text-xs text-slate-500">{shortBio.length}/500</p></div></div>}
      {step === 2 && <div className="space-y-5"><div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">পাসওয়ার্ড</label><div className="relative"><LockKeyhole size={18} className="absolute left-3 top-3.5 text-slate-400" /><input id="password" name="password" required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} pl-10 pr-12`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1 min-h-10 rounded-lg p-2 text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary" aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><div className="mt-2 flex items-center gap-2"><div className="flex flex-1 gap-1">{[1, 2, 3].map((bar) => <span key={bar} className={`h-1.5 flex-1 rounded-full ${strength >= bar ? strength === 3 ? 'bg-green-500' : 'bg-amber-400' : 'bg-slate-100'}`} />)}</div><span className="text-xs text-slate-500">{strengthLabel}</span></div></div><div><label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">পাসওয়ার্ড নিশ্চিত করুন</label><input id="confirm-password" name="confirm_password" required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></div><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />রেজিস্টার করে আপনি আমাদের শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত হচ্ছেন</label></div>}
      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert" aria-live="polite">{error}</div>}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={step === 0 || submitting} onClick={() => { setError(''); setStep((current) => current - 1) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:invisible"><ArrowLeft size={18} /> পূর্ববর্তী</button>{step < 2 ? <button type="button" onClick={nextStep} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100">পরবর্তী <ArrowRight size={18} /></button> : <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><LoaderCircle size={18} className="animate-spin" /> আবেদন পাঠানো হচ্ছে...</> : 'আবেদন জমা দিন'}</button>}</div>
    </form>
  </section>
}

function Field({ label, className = '', ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className={className}><label htmlFor={props.id ?? props.name} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><input id={props.id ?? props.name} className={inputClass} {...props} /></div>
}
