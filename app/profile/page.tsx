"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function TutorProfileEditPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [subjects, setSubjects] = useState<string[]>([])
  const [district, setDistrict] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'tutor')) router.replace('/login')
  }, [loading, profile?.role, router, user])

  useEffect(() => {
    if (!profile) return
    setSubjects(profile.subjects ?? [])
    setDistrict(profile.district ?? '')
    setShortBio(profile.short_bio ?? '')
    setPhotoUrl(profile.photo_url ?? '')
  }, [profile])

  function toggleSubject(subject: string) {
    setSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!user) return
    if (subjects.length === 0) return setError('কমপক্ষে একটি বিষয় নির্বাচন করুন')
    if (!district) return setError('জেলা নির্বাচন করুন')

    setSaving(true)
    const { error: updateError } = await supabase.from('profiles').update({
      subjects,
      district,
      short_bio: shortBio.trim(),
      photo_url: photoUrl.trim() || null,
    }).eq('id', user.id)
    setSaving(false)

    if (updateError) setError(updateError.message)
    else setMessage('আপনার প্রোফাইল আপডেট হয়েছে')
  }

  if (loading || !user || profile?.role !== 'tutor') return <div className="min-h-screen bg-gray-50" />

  return <div className="min-h-screen bg-gray-50 text-gray-900">
    <Navbar />
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-primary">আমার প্রোফাইল</h1>
      {profile.status === 'pending' && <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">আপনার প্রোফাইল অনুমোদনের অপেক্ষায় আছে</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="mb-2 block font-medium">পড়াতে পারেন এমন বিষয় <span className="text-red-600">*</span></legend>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => <label key={subject} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm">
              <input type="checkbox" checked={subjects.includes(subject)} onChange={() => toggleSubject(subject)} />
              {subject}
            </label>)}
          </div>
        </fieldset>

        <div>
          <label htmlFor="profile-district" className="mb-1 block font-medium">জেলা <span className="text-red-600">*</span></label>
          <select id="profile-district" required value={district} onChange={(event) => setDistrict(event.target.value)} className="w-full rounded border p-2">
            <option value="">জেলা নির্বাচন করুন</option>
            {DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>
              {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </optgroup>)}
          </select>
        </div>

        <div>
          <label htmlFor="profile-bio" className="mb-1 block font-medium">সংক্ষিপ্ত পরিচিতি</label>
          <textarea id="profile-bio" maxLength={500} value={shortBio} onChange={(event) => setShortBio(event.target.value)} className="min-h-28 w-full rounded border p-2" />
          <p className="mt-1 text-right text-xs text-gray-500">{shortBio.length}/500</p>
        </div>

        <div>
          <label htmlFor="profile-photo" className="mb-1 block font-medium">ছবির লিংক</label>
          <input id="profile-photo" type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." className="w-full rounded border p-2" />
          {photoUrl && <img src={photoUrl} alt="প্রোফাইল প্রিভিউ" className="mt-3 h-24 w-24 rounded-full object-cover" />}
        </div>

        <button type="submit" disabled={saving} className="rounded bg-primary px-5 py-2 text-white disabled:opacity-60">{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</button>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      </form>
    </main>
  </div>
}