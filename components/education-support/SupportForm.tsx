'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import Footer from '../Footer'
import Navbar from '../Navbar'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

type FormKind = 'request' | 'volunteer'
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

export default function SupportForm({ kind }: { kind: FormKind }) {
  const router = useRouter()
  const { loading, user } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const isRequest = kind === 'request'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setSuccess(false)
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/education-support/${kind}`)}`)
      return
    }
    const data = new FormData(event.currentTarget)
    const subjects = String(data.get('subjects') ?? '').split(',').map((value) => value.trim()).filter(Boolean)
    const payload = isRequest ? {
      student_name: data.get('student_name'),
      student_class: data.get('student_class'),
      district: data.get('district'),
      upazila: data.get('upazila'),
      need_type: data.get('need_type'),
      subjects,
      description: data.get('description'),
      guardian_contact: data.get('guardian_contact'),
      consent: data.get('consent') === 'on',
    } : {
      offer_type: data.get('offer_type'),
      subjects,
      districts: String(data.get('districts') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      available_days: data.get('available_days'),
      description: data.get('description'),
    }

    setSaving(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) throw new Error('আপনার লগইন যাচাই করা যায়নি। আবার লগইন করুন।')
      const response = await fetch(`/api/education-support/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'তথ্য পাঠানো যায়নি')
      setSuccess(true)
      form.reset()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'তথ্য পাঠানো যায়নি')
    } finally {
      setSaving(false)
    }
  }

  return <div className="min-h-screen bg-slate-50">
    <Navbar />
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/education-support" className="text-sm font-semibold text-primary hover:underline">← শিক্ষা সহায়তা</Link>
      <header className="mt-4"><p className="font-semibold text-amber-600">শিক্ষা সহায়তা</p><h1 className="mt-1 text-3xl font-bold text-blue-950">{isRequest ? 'সহায়তার আবেদন' : 'স্বেচ্ছাসেবক হিসেবে যুক্ত হোন'}</h1><p className="mt-2 leading-7 text-slate-600">{isRequest ? 'প্রয়োজনীয় তথ্য দিন। আপনার তথ্য কেবল যাচাই ও সহায়তার মিল করানোর কাজে ব্যবহৃত হবে।' : 'কোন বিষয়ে, কোন এলাকায় এবং কখন সহায়তা করতে পারবেন তা জানান।'}</p></header>
      {loading ? <p className="mt-8 rounded-xl bg-white p-5 text-slate-600">অ্যাকাউন্ট যাচাই হচ্ছে...</p> : !user ? <div className="mt-6 rounded-xl border border-blue-100 bg-white p-5"><p className="text-slate-700">ফর্ম পূরণ করতে লগইন করতে হবে।</p><Link href={`/login?next=${encodeURIComponent(`/education-support/${kind}`)}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 font-semibold text-white">লগইন করুন</Link></div> : (
        <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
          {isRequest ? <>
            <label className="text-sm font-semibold text-slate-700">শিক্ষার্থীর নাম<input name="student_name" required minLength={2} maxLength={120} autoComplete="name" className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700">শ্রেণি<input name="student_class" required maxLength={80} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700">জেলা<input name="district" required maxLength={100} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700">উপজেলা<input name="upazila" required maxLength={100} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700">কী ধরনের সহায়তা চান<select name="need_type" className={`${inputClass} mt-1 font-normal`}><option value="free_tuition">বিনামূল্যে পড়ানো</option><option value="books_materials">বই ও শিক্ষা উপকরণ</option></select></label>
            <label className="text-sm font-semibold text-slate-700">বিষয়সমূহ<input name="subjects" required maxLength={500} placeholder="কমা দিয়ে লিখুন, যেমন: বাংলা, গণিত" className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">অভিভাবকের যোগাযোগ নম্বর<input name="guardian_contact" required minLength={5} maxLength={100} autoComplete="tel" className={`${inputClass} mt-1 font-normal`} /><span className="mt-1 block text-xs font-normal text-slate-500">এই নম্বর প্রকাশ্যে দেখানো হবে না।</span></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">কী সহায়তা প্রয়োজন<textarea name="description" required minLength={10} maxLength={2000} rows={4} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-700 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-blue-700" /><span>যাচাই ও সহায়তার মিল করানোর জন্য আমার দেওয়া তথ্য ব্যবহার করতে সম্মতি দিচ্ছি। অভিভাবকের যোগাযোগের তথ্য কেবল প্রশাসক এবং মিল হওয়া স্বেচ্ছাসেবক দেখতে পারবেন।</span></label>
          </> : <>
            <label className="text-sm font-semibold text-slate-700">কী ধরনের সহায়তা করবেন<select name="offer_type" className={`${inputClass} mt-1 font-normal`}><option value="free_tuition">বিনামূল্যে পড়ানো</option><option value="books_materials">বই ও শিক্ষা উপকরণ</option></select></label>
            <label className="text-sm font-semibold text-slate-700">যে বিষয়গুলোতে সহায়তা করবেন<input name="subjects" maxLength={500} placeholder="কমা দিয়ে লিখুন" className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">যে জেলাগুলোতে সহায়তা করতে পারবেন<input name="districts" maxLength={1000} placeholder="কমা দিয়ে লিখুন" className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">কোন দিন বা সময়ে পারবেন<input name="available_days" required maxLength={500} placeholder="যেমন: শুক্রবার বিকেল, সপ্তাহে ২ দিন" className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">আপনার সহায়তার বিবরণ<textarea name="description" required minLength={10} maxLength={2000} rows={4} className={`${inputClass} mt-1 font-normal`} /></label>
          </>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
          {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700 sm:col-span-2">আপনার তথ্য জমা হয়েছে। প্রশাসক যাচাই করার পর অবস্থা জানানো হবে।</p>}
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60 sm:col-span-2">{saving ? 'পাঠানো হচ্ছে...' : 'তথ্য জমা দিন'}</button>
        </form>
      )}
    </main>
    <Footer />
  </div>
}
