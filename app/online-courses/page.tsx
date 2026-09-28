"use client"

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

const dummyCourses = [
  { id: 1, title: 'গণিত - দ্বিঘাত সমীকরণ (চ্যাপ্টার ৫)', teacher: 'মোঃ রহমান', subject: 'গণিত', level: 'ক্লাস ১০', price: 300 },
  { id: 2, title: 'বাংলা - গদ্য পাঠ (চ্যাপ্টার ৩)', teacher: 'ফরিদা খাতুন', subject: 'বাংলা', level: 'ক্লাস ৯', price: 250 },
  { id: 3, title: 'ইংরেজি - রপ্তানি কসরত (চ্যাপ্টার ৪)', teacher: 'জন কাবির', subject: 'ইংরেজি', level: 'ক্লাস ৮', price: 200 },
  { id: 4, title: 'রসায়ন - অম্ল ক্ষার (চ্যাপ্টার ২)', teacher: 'ড. শামীম', subject: 'রসায়ন', level: 'ক্লাস ১০', price: 350 },
  { id: 5, title: 'ভূগোল - মানচিত্র পাঠ (চ্যাপ্টার ১)', teacher: 'আলম ভাই', subject: 'ভূগোল', level: 'ক্লাস ৭', price: 180 },
  { id: 6, title: 'ভিত্তি গণিত - অংক কৌশল (চ্যাপ্টার ২)', teacher: 'সুলতান', subject: 'গণিত', level: 'ক্লাস ৬', price: 150 },
  { id: 7, title: 'ফিজিক্স - গতিশক্তি (চ্যাপ্টার ৬)', teacher: 'রাকিব স্যার', subject: 'ফিজিক্স', level: 'ক্লাস ১০', price: 320 },
  { id: 8, title: 'জীববিজ্ঞান - কোষ তত্ত্ব (চ্যাপ্টার ১)', teacher: 'মাহি প্লাবন', subject: 'জীববিজ্ঞান', level: 'ক্লাস ৯', price: 280 }
]

export default function OnlineCoursesPage() {
  const [tab, setTab] = useState<'courses' | 'live'>('courses')
  const [subjectFilter, setSubjectFilter] = useState('সব')
  const [levelFilter, setLevelFilter] = useState('সব')
  const coursesRef = useRef<HTMLElement | null>(null)
  const liveRef = useRef<HTMLElement | null>(null)

  const subjects = Array.from(new Set(dummyCourses.map(c => c.subject)))
  const levels = Array.from(new Set(dummyCourses.map(c => c.level)))

  const filtered = dummyCourses.filter(c => (subjectFilter === 'সব' || c.subject === subjectFilter) && (levelFilter === 'সব' || c.level === levelFilter))

  function handleBuy() {
    alert('শীঘ্রই পেমেন্ট সিস্টেম চালু হবে')
  }

  const [courseSuccess, setCourseSuccess] = useState('')
  const [courseError, setCourseError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [courseSubmitting, setCourseSubmitting] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  async function handleSubmitCourse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    setCourseSuccess('')
    setCourseError('')
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
    setCourseSubmitting(true)

    try {
      const { error } = await supabase.from('courses').insert({
        title: value(2),
        subject: value(3),
        chapter: value(4),
        class_level: value(5),
        price: value(6) || null,
        description: value(7),
      })
      if (error) {
        setCourseError(error.message)
        return
      }
      form.reset()
      setCourseSuccess('আপনার কোর্স রিভিউর জন্য জমা হয়েছে, অনুমোদনের পর এটি লিস্টে যুক্ত হবে')
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : 'কোর্স পাঠানো যায়নি')
    } finally {
      setCourseSubmitting(false)
    }
  }

  async function handleBookTuition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    setBookingSuccess('')
    setBookingError('')
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value
    setBookingSubmitting(true)

    try {
      const { error } = await supabase.from('live_tuition_bookings').insert({
        name: value(0),
        phone: value(1),
        subject: value(2),
        class_level: value(3),
        preferred_time: value(4),
        days_per_week: value(5),
        budget: value(6) || null,
        details: value(7),
      })
      if (error) {
        setBookingError(error.message)
        return
      }
      form.reset()
      setBookingSuccess('আপনার রিকোয়েস্ট গ্রহণ করা হয়েছে, শীঘ্রই একজন টিউটরের সাথে যোগাযোগ করানো হবে')
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'টিউশন বুকিং পাঠানো যায়নি')
    } finally {
      setBookingSubmitting(false)
    }
  }

  function goToSection(s: 'courses' | 'live') {
    setTab(s)
    const ref = s === 'courses' ? coursesRef.current : liveRef.current
    ref?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-r from-primary to-sky-600 text-white py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">অনলাইন কোর্স ও টিউশন</h1>
              <p className="mb-6">সাবজেক্ট বা চ্যাপ্টার ভিত্তিক কোর্স কিনুন, অথবা লাইভ অনলাইন টিউশন বুক করুন</p>

              <div className="inline-flex max-w-full flex-col sm:flex-row bg-white/20 rounded-lg p-1">
                <button onClick={() => goToSection('courses')} className={`px-4 py-2 rounded ${tab === 'courses' ? 'bg-white text-primary font-semibold' : 'text-white/90'}`}>কোর্স ব্রাউজ করুন</button>
                <button onClick={() => goToSection('live')} className={`px-4 py-2 rounded ${tab === 'live' ? 'bg-white text-primary font-semibold' : 'text-white/90'}`}>লাইভ টিউশন বুক করুন</button>
              </div>
            </div>
          </div>
        </section>

        <section ref={coursesRef} className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-4">কোর্স মার্কেটপ্লেস</h2>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="border px-3 py-2 rounded">
              <option value="সব">সব সাবজেক্ট</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="border px-3 py-2 rounded">
              <option value="সব">সব ক্লাস/লেভেল</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow p-4">
                <div className="h-40 bg-sky-50 rounded mb-3 flex items-center justify-center text-primary/50">কোর্সের ছবি</div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-gray-600">শিক্ষক: {c.teacher}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">{c.subject}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{c.level}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-lg font-semibold">{c.price} টাকা</div>
                  <button onClick={handleBuy} className="bg-sky-600 text-white px-3 py-2 rounded">কিনুন</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-sky-50 p-6 rounded-xl shadow">
            <h3 className="text-xl font-semibold mb-3">আপনি একজন শিক্ষক? আপনার কোর্স বিক্রি করুন</h3>
            <form onSubmit={handleSubmitCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="শিক্ষকের নাম" className="border px-3 py-2 rounded" />
              <input required placeholder="ইমেইল বা ফোন" className="border px-3 py-2 rounded bg-white" />
              <input required placeholder="কোর্সের নাম" className="border px-3 py-2 rounded col-span-1 md:col-span-2" />
              <select required className="border px-3 py-2 rounded">
                <option value="">সাবজেক্ট নির্বাচন করুন</option>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
              <input placeholder="চ্যাপ্টার/টপিক" className="border px-3 py-2 rounded" />
              <select required className="border px-3 py-2 rounded">
                <option value="">ক্লাস লেভেল</option>
                {levels.map(l => <option key={l}>{l}</option>)}
              </select>
              <input type="number" placeholder="মূল্য (টাকা)" className="border px-3 py-2 rounded" />
              <textarea placeholder="কোর্সের বিবরণ" className="border px-3 py-2 rounded col-span-1 md:col-span-2" />
              <div className="col-span-1 md:col-span-2">
                <label className="inline-block mb-2">কোর্স ফাইল/ভিডিও আপলোড</label>
                <label className="block border-dashed border-2 border-gray-300 bg-white p-4 rounded text-gray-500 text-center cursor-pointer hover:border-primary">
                  ফাইল বাছাই করুন
                  <input type="file" className="sr-only" />
                </label>
              </div>
              <div className="col-span-1 md:col-span-2">
                <button disabled={courseSubmitting} type="submit" className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-60">কোর্স জমা দিন</button>
              </div>
            </form>
          </div>
        </section>

        <section ref={liveRef} className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-2">লাইভ অনলাইন টিউশন বুক করুন</h2>
          <p className="text-gray-700 mb-6">একজন ভেরিফাইড টিউটরের সাথে সরাসরি লাইভ ক্লাসে যুক্ত হন</p>

          <form onSubmit={handleBookTuition} className="bg-white p-6 rounded-xl shadow grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="আপনার নাম" className="border px-3 py-2 rounded" />
            <input required placeholder="ফোন নাম্বার" className="border px-3 py-2 rounded" />
            <select required className="border px-3 py-2 rounded">
              <option value="">সাবজেক্ট নির্বাচন করুন</option>
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
            <select required className="border px-3 py-2 rounded">
              <option value="">ক্লাস/লেভেল</option>
              {levels.map(l => <option key={l}>{l}</option>)}
            </select>
            <input placeholder="পছন্দের দিন ও সময়" className="border px-3 py-2 rounded" />
            <select required className="border px-3 py-2 rounded">
              <option value="">সপ্তাহে কতদিন</option>
              <option>১</option>
              <option>২</option>
              <option>৩+</option>
            </select>
            <input type="number" placeholder="বাজেট (প্রতি ক্লাস/মাস)" className="border px-3 py-2 rounded" />
            <textarea placeholder="অতিরিক্ত বিবরণ" className="border px-3 py-2 rounded col-span-1 md:col-span-2" />
            <div className="col-span-1 md:col-span-2">
              <button disabled={bookingSubmitting} type="submit" className="bg-sky-600 text-white px-4 py-2 rounded disabled:opacity-60">টিউশন বুক করুন</button>
            </div>
          </form>
        </section>
      {(courseError || courseSuccess || bookingError || bookingSuccess) && (
        <div className="container mx-auto px-4 pb-6 space-y-3">
          {courseError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{courseError}</p>}
          {courseSuccess && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">{courseSuccess}</p>}
          {bookingError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{bookingError}</p>}
          {bookingSuccess && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">{bookingSuccess}</p>}
        </div>
      )}
      </main>

      <Footer />
    </div>
  )
}
