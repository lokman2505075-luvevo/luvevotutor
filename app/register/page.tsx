"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import { supabase } from '../../lib/supabaseClient'

export default function RegisterPage() {
  const router = useRouter()
  const [type, setType] = useState<'student'|'tutor'>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [district, setDistrict] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleSubject(subject: string) {
    setSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('পাসওয়ার্ড দুটো একই নয়')
      return
    }
    if (type === 'tutor' && subjects.length === 0) {
      setError('কমপক্ষে একটি বিষয় নির্বাচন করুন')
      return
    }
    if (type === 'tutor' && !district) {
      setError('জেলা নির্বাচন করুন')
      return
    }

    setSubmitting(true)
    const metadata = type === 'tutor'
      ? { full_name: name, phone, role: 'tutor', subjects, district, short_bio: shortBio.trim() }
      : { full_name: name, phone, role: 'student' }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'রেজিস্ট্রেশন সম্পন্ন করা যায়নি')
      setSubmitting(false)
      return
    }

    setSuccess('রেজিস্ট্রেশন সফল হয়েছে। হোমপেজে নেওয়া হচ্ছে...')
    window.setTimeout(() => router.push('/?registered=1'), 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <header className="text-center mb-6">
          <Link href="/" className="inline-block text-2xl font-bold text-primary">Luvevo Tutor</Link>
        </header>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-semibold text-center text-primary">রেজিস্টার করুন</h1>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={() => setType('student')} className={`px-4 py-2 rounded ${type==='student' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}>স্টুডেন্ট/অভিভাবক</button>
            <button onClick={() => setType('tutor')} className={`px-4 py-2 rounded ${type==='tutor' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}>টিউটর</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ইমেইল" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ফোন নাম্বার" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {type === 'tutor' && <>
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-700">পড়াতে পারেন এমন বিষয় <span className="text-red-600">*</span></legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((subject) => <label key={subject} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm">
                    <input type="checkbox" checked={subjects.includes(subject)} onChange={() => toggleSubject(subject)} />
                    {subject}
                  </label>)}
                </div>
              </fieldset>

              <div>
                <label htmlFor="district" className="mb-1 block text-sm font-medium text-gray-700">জেলা <span className="text-red-600">*</span></label>
                <select id="district" required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full rounded border p-2">
                  <option value="">জেলা নির্বাচন করুন</option>
                  {DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>
                    {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </optgroup>)}
                </select>
              </div>

              <div>
                <label htmlFor="short-bio" className="mb-1 block text-sm font-medium text-gray-700">সংক্ষিপ্ত পরিচিতি</label>
                <textarea id="short-bio" maxLength={500} value={shortBio} onChange={(e) => setShortBio(e.target.value)} className="min-h-28 w-full rounded border p-2" />
                <p className="mt-1 text-right text-xs text-gray-500">{shortBio.length}/500</p>
              </div>
            </>}
            <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="পাসওয়ার্ড" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input required minLength={6} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="পাসওয়ার্ড কনফার্ম" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />

            <div>
              <button disabled={submitting} type="submit" className="w-full bg-primary text-white py-2 rounded disabled:opacity-60">{submitting ? 'অপেক্ষা করুন...' : 'রেজিস্টার করুন'}</button>
            </div>

            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{success}</p>}

            <div className="text-center text-sm">
              <span>আগে থেকে একাউন্ট আছে? </span>
              <Link href="/login" className="text-primary font-medium">লগইন করুন</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
