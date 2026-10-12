"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import AvatarUpload from '../../components/AvatarUpload'
import TutorProfile from '../../components/profile/TutorProfile'
import SellerListingForm from '../../components/marketplace/SellerListingForm'
import { MarketplaceBuyerOrders } from '../../components/marketplace/BuyerSections'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { SUBJECTS } from '../../lib/subjects'
import ProfileEducationFields from '../../components/sohojatri/ProfileEducationFields'
import MySohojatri from '../../components/sohojatri/MySohojatri'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, refreshProfile } = useAuth()
  const isTutor = profile?.role === 'tutor'

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [institutionType, setInstitutionType] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [level, setLevel] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [shortBio, setShortBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  // shudhu prothombar (ba user bodlale) form-e data boshabe,
  // tai refreshProfile() call hole likhe rakha field reset hobe na
  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setDistrict(profile.district ?? '')
    setInstitutionType(profile.institution_type ?? '')
    setInstitutionName(profile.institution_name ?? '')
    setLevel(profile.level ?? '')
    setBirthDate(profile.birth_date ?? '')
    setSubjects(profile.subjects ?? [])
    setShortBio(profile.short_bio ?? '')
    setPhotoUrl(profile.photo_url ?? '')
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSubject(subject: string) {
    setSubjects((current) =>
      current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!user) return

    if (!fullName.trim()) return setError('নাম লিখুন')
    if (!district) return setError('জেলা নির্বাচন করুন')
    if (isTutor && subjects.length === 0) return setError('কমপক্ষে একটি বিষয় নির্বাচন করুন')

    const updates: Record<string, unknown> = isTutor
      ? {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          subjects,
          district,
          short_bio: shortBio.trim(),
          institution_type: institutionType || null,
          institution_name: institutionName.trim() || null,
          level: level || null,
          birth_date: birthDate || null,
        }
      : {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          district,
          institution_type: institutionType || null,
          institution_name: institutionName.trim() || null,
          level: level || null,
          birth_date: birthDate || null,
        }

    setSaving(true)
    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage('আপনার প্রোফাইল আপডেট হয়েছে')
      void refreshProfile()
    }
  }

  if (loading || !user || !profile) return <div className="min-h-screen bg-gray-50" />

  // Tutor-দের জন্য নতুন প্রোফাইল পেজ
  if (isTutor) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <TutorProfile user={user} profile={profile} refreshProfile={refreshProfile} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-primary">আমার প্রোফাইল</h1>
        <MySohojatri userId={user.id} />

        {isTutor && profile.status === 'pending' && (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
            আপনার প্রোফাইল অনুমোদনের অপেক্ষায় আছে
          </p>
        )}

        {isTutor && profile.status === 'approved' && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">আপনার কোর্স</h2>
            <p className="mt-1 text-sm text-gray-600">
              আপনার সাবজেক্ট/চ্যাপ্টার ভিত্তিক কোর্স তৈরি করে বিক্রি করুন।
            </p>
            <a href="/tutor-hub/new-course" className="mt-4 inline-block rounded bg-sky-600 px-4 py-2 text-white">
              + নতুন কোর্স যোগ করুন
            </a>
          </div>
        )}

        {!isTutor && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">আমার কেনা কোর্স</h2>
            <p className="mt-1 text-sm text-gray-600">আপনার কেনা সব কোর্স এক জায়গায় দেখুন।</p>
            <Link href="/my-courses" className="mt-3 inline-block font-semibold text-primary">
              কোর্সগুলো দেখুন →
            </Link>
            {profile.role === 'student' && <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="font-bold text-primary">শিক্ষা উপকরণ বিক্রি করুন</h3>
              <p className="mt-1 text-sm text-gray-600">পুরনো বই, নোট বা শিক্ষাসামগ্রী মার্কেটপ্লেসে তালিকাভুক্ত করুন।</p>
              <Link href={user.phone_confirmed_at ? '/educational-product/sell' : '/educational-product/sell#phone-verification'} className="mt-3 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-amber-600">
                {user.phone_confirmed_at ? 'পণ্য বিক্রি করুন' : 'আগে ফোন ভেরিফাই করুন'}
              </Link>
            </div>}
          </div>
        )}

        {profile.role === 'student' && <div className="mt-6"><SellerListingForm showForm={false} /></div>}
        {profile.role === 'student' && <MarketplaceBuyerOrders />}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-2 block font-medium">প্রোফাইল ছবি</label>
            <AvatarUpload
              userId={user.id}
              currentUrl={photoUrl}
              onDone={(url) => {
                setPhotoUrl(url)
                void refreshProfile()
              }}
            />
          </div>

          <div>
            <label htmlFor="profile-name" className="mb-1 block font-medium">
              নাম <span className="text-red-600">*</span>
            </label>
            <input
              id="profile-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="mb-1 block font-medium">ফোন নম্বর</label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="profile-district" className="mb-1 block font-medium">
              জেলা <span className="text-red-600">*</span>
            </label>
            <select
              id="profile-district"
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded border p-2"
            >
              <option value="">জেলা নির্বাচন করুন</option>
              {DISTRICTS_BY_DIVISION.map(({ division, districts }) => (
                <optgroup key={division} label={division}>
                  {districts.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <ProfileEducationFields
            institutionType={institutionType}
            institutionName={institutionName}
            level={level}
            birthDate={birthDate}
            onChange={(field, value) => {
              if (field === 'institution_type') setInstitutionType(value)
              if (field === 'institution_name') setInstitutionName(value)
              if (field === 'level') setLevel(value)
              if (field === 'birth_date') setBirthDate(value)
            }}
          />

          {isTutor && (
            <>
              <fieldset>
                <legend className="mb-2 block font-medium">
                  পড়াতে পারেন এমন বিষয় <span className="text-red-600">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((subject) => (
                    <label key={subject} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={subjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="profile-bio" className="mb-1 block font-medium">সংক্ষিপ্ত পরিচিতি</label>
                <textarea
                  id="profile-bio"
                  maxLength={500}
                  value={shortBio}
                  onChange={(e) => setShortBio(e.target.value)}
                  className="min-h-28 w-full rounded border p-2"
                />
                <p className="mt-1 text-right text-xs text-gray-500">{shortBio.length}/500</p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-primary px-5 py-2 text-white disabled:opacity-60"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}
        </form>
      </main>
    </div>
  )
}