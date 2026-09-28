"use client"

import { useState, type FormEvent } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

type Tab = 'hire' | 'help' | 'group'

const helpers = [
  { name: 'সাদিয়া রহমান', university: 'ঢাকা বিশ্ববিদ্যালয়', expertise: 'কম্পিউটার সায়েন্স, প্রোগ্রামিং', rating: '৪.৯' },
  { name: 'আরিফুল ইসলাম', university: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়', expertise: 'ইলেকট্রিক্যাল প্রজেক্ট, গণিত', rating: '৪.৮' },
  { name: 'মেহেদী হাসান', university: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', expertise: 'বিজনেস, মার্কেটিং, গবেষণা', rating: '৪.৭' },
  { name: 'তানজিলা নূর', university: 'রাজশাহী বিশ্ববিদ্যালয়', expertise: 'বাংলা, ইংরেজি, রিপোর্ট লেখা', rating: '৪.৯' },
  { name: 'নাবিল আহমেদ', university: 'চট্টগ্রাম বিশ্ববিদ্যালয়', expertise: 'ফিজিক্স, ডেটা অ্যানালাইসিস', rating: '৪.৬' },
]

const groupPosts = [
  { name: 'নুসরাত জাহান', university: 'ঢাকা বিশ্ববিদ্যালয়', subject: 'কম্পিউটার সায়েন্স', description: 'মেশিন লার্নিং প্রজেক্টে কাজ করার জন্য টিম খুঁজছি।', needed: 'আরও ২ জন প্রয়োজন' },
  { name: 'রিফাত করিম', university: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়', subject: 'ইলেকট্রিক্যাল ইঞ্জিনিয়ারিং', description: 'স্মার্ট হোম অটোমেশন নিয়ে গ্রুপ প্রজেক্ট করতে চাই।', needed: 'আরও ৩ জন প্রয়োজন' },
  { name: 'মারিয়া ইসলাম', university: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', subject: 'বিজনেস স্টাডিজ', description: 'কেস স্টাডি ও প্রেজেন্টেশন তৈরির জন্য সঙ্গী চাই।', needed: 'আরও ১ জন প্রয়োজন' },
  { name: 'সাইফুল হক', university: 'রাজশাহী বিশ্ববিদ্যালয়', subject: 'ইংরেজি', description: 'একসাথে IELTS প্রস্তুতির জন্য স্টাডি গ্রুপ বানাতে চাই।', needed: 'আরও ৪ জন প্রয়োজন' },
  { name: 'আফরোজা সুলতানা', university: 'চট্টগ্রাম বিশ্ববিদ্যালয়', subject: 'অর্থনীতি', description: 'গবেষণা পেপার লেখার জন্য আগ্রহী সহপাঠী খুঁজছি।', needed: 'আরও ২ জন প্রয়োজন' },
]

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100'

export default function AssignmentProjectPage() {
  const [tab, setTab] = useState<Tab>('hire')
  const [hireSuccess, setHireSuccess] = useState(false)
  const [helperSuccess, setHelperSuccess] = useState(false)
  const [groupSuccess, setGroupSuccess] = useState(false)
  const [hireError, setHireError] = useState('')
  const [helperError, setHelperError] = useState('')
  const [groupError, setGroupError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [universityFilter, setUniversityFilter] = useState('সব বিশ্ববিদ্যালয়')
  const [subjectFilter, setSubjectFilter] = useState('সব বিষয়')
  const [fileName, setFileName] = useState('')

  async function submitHire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    setHireError('')
    setHireSuccess(false)
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLTextAreaElement).value
    setSubmitting(true)

    try {
      const { error } = await supabase.from('assignment_requests').insert({
        name: value(0),
        phone: value(1),
        subject: value(2),
        deadline: value(3),
        details: value(4),
      })
      if (error) {
        setHireError(error.message)
        return
      }
      form.reset()
      setFileName('')
      setHireSuccess(true)
    } catch (error) {
      setHireError(error instanceof Error ? error.message : 'রিকোয়েস্ট পাঠানো যায়নি')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitHelper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    setHelperError('')
    setHelperSuccess(false)
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLTextAreaElement).value
    setSubmitting(true)

    try {
      const { error } = await supabase.from('helpers').insert({
        name: value(0),
        phone: value(1),
        university: value(2),
        expertise: value(3),
        experience: value(4),
        expected_fee: value(5),
      })
      if (error) {
        setHelperError(error.message)
        return
      }
      form.reset()
      setHelperSuccess(true)
    } catch (error) {
      setHelperError(error instanceof Error ? error.message : 'হেল্পার আবেদন পাঠানো যায়নি')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    setGroupError('')
    setGroupSuccess(false)
    const fields = form.elements
    const value = (index: number) => (fields[index] as HTMLInputElement | HTMLTextAreaElement).value
    setSubmitting(true)

    try {
      const { error } = await supabase.from('study_groups').insert({
        name: value(0),
        university: value(1),
        subject: value(2),
        description: value(4),
        members_needed: value(3),
      })
      if (error) {
        setGroupError(error.message)
        return
      }
      form.reset()
      setGroupSuccess(true)
      setShowGroupForm(false)
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : 'গ্রুপ পোস্ট পাঠানো যায়নি')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredGroups = groupPosts.filter((post) => (
    (universityFilter === 'সব বিশ্ববিদ্যালয়' || post.university === universityFilter) &&
    (subjectFilter === 'সব বিষয়' || post.subject === subjectFilter)
  ))

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="bg-blue-50 px-4 py-12 md:py-16">
          <div className="container mx-auto text-center">
            <p className="font-semibold text-yellow-600">সহযোগিতায় এগিয়ে যান</p>
            <h1 className="mt-2 text-3xl font-bold text-blue-950 md:text-5xl">অ্যাসাইনমেন্ট ও প্রজেক্ট সহায়তা</h1>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">আপনার কাজের জন্য দক্ষ সাহায্যকারী খুঁজুন, অথবা নিজের দক্ষতা দিয়ে অন্যদের সাহায্য করুন।</p>
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 rounded-xl bg-white p-2 shadow-sm">
              {[
                { id: 'hire' as Tab, label: 'সাহায্য নিন' },
                { id: 'help' as Tab, label: 'সাহায্য দিন' },
                { id: 'group' as Tab, label: 'স্টাডি গ্রুপ / টিম আপ' },
              ].map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition sm:text-base ${tab === item.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-primary'}`}>{item.label}</button>)}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12 md:py-16">
          {tab === 'hire' && <section>
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-blue-950 md:text-3xl">আপনার অ্যাসাইনমেন্টের জন্য সাহায্য নিন</h2>
              <p className="mt-2 text-gray-600">কাজের বিস্তারিত পাঠান, আমরা আপনার জন্য উপযুক্ত হেল্পার খুঁজে দেব।</p>
              <form onSubmit={submitHire} className="mt-7 grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
                <input required placeholder="আপনার নাম" className={inputClass} />
                <input required placeholder="ফোন নাম্বার" className={inputClass} />
                <input required placeholder="সাবজেক্ট/বিষয়" className={inputClass} />
                <input required type="date" className={inputClass} />
                <textarea required placeholder="কাজের বিস্তারিত লিখুন" className={`${inputClass} min-h-32 md:col-span-2`} />
                <label className="text-sm text-gray-600 md:col-span-2">ফাইল আপলোড (ঐচ্ছিক)<input type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} className="mt-2 block w-full text-sm" />{fileName && <span className="mt-1 block text-primary">{fileName}</span>}</label>
                <button disabled={submitting} type="submit" className="rounded-lg bg-accent px-5 py-3 font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-60 md:col-span-2 md:w-fit">রিকোয়েস্ট পাঠান</button>
              </form>
              {hireSuccess && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">আপনার রিকোয়েস্ট গ্রহণ করা হয়েছে — শীঘ্রই আমাদের টিম যোগাযোগ করবে।</p>}
            </div>

            <div className="mt-16"><h2 className="text-2xl font-bold text-blue-950">উপলব্ধ হেল্পাররা</h2><p className="mt-2 text-gray-600">আপনার প্রয়োজন অনুযায়ী একজন অভিজ্ঞ হেল্পার বেছে নিন।</p><div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{helpers.map((helper) => <article key={helper.name} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="flex items-start justify-between"><div><h3 className="font-bold text-blue-950">{helper.name}</h3><p className="mt-1 text-sm text-gray-500">{helper.university}</p></div><span className="rounded-full bg-yellow-100 px-2 py-1 text-sm font-semibold text-yellow-700">★ {helper.rating}</span></div><p className="mt-4 text-sm text-gray-600">দক্ষতা: {helper.expertise}</p><button type="button" onClick={() => alert(`${helper.name}-এর সাথে যোগাযোগের অনুরোধ পাঠানো হয়েছে`)} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">যোগাযোগ করুন</button></article>)}</div></div>
          </section>}

          {tab === 'help' && <section className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-blue-950 md:text-3xl">আপনি কি অ্যাসাইনমেন্ট/প্রজেক্টে সাহায্য করতে পারেন?</h2>
            <p className="mt-2 text-gray-600">আপনার দক্ষতা অন্যদের কাজে লাগান এবং নিজের অভিজ্ঞতা তৈরি করুন।</p>
            <form onSubmit={submitHelper} className="mt-7 grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
              <input required placeholder="আপনার নাম" className={inputClass} /><input required placeholder="ফোন/ইমেইল" className={inputClass} />
              <input required placeholder="ভার্সিটি/প্রতিষ্ঠানের নাম" className={`${inputClass} md:col-span-2`} /><input required placeholder="দক্ষতার বিষয়/সাবজেক্ট (কমা দিয়ে লিখুন)" className={`${inputClass} md:col-span-2`} />
              <textarea required placeholder="অভিজ্ঞতা সংক্ষেপে লিখুন" className={`${inputClass} min-h-32 md:col-span-2`} /><input required type="number" placeholder="প্রতি কাজে প্রত্যাশিত পারিশ্রমিক (টাকা)" className={inputClass} />
              <button disabled={submitting} type="submit" className="rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-yellow-600 disabled:opacity-60 md:col-span-2 md:w-fit">হেল্পার হিসেবে যুক্ত হন</button>
            </form>
            {helperSuccess && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">আপনার আবেদন যাচাইয়ের জন্য জমা হয়েছে</p>}
          </section>}

          {tab === 'group' && <section>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="text-2xl font-bold text-blue-950 md:text-3xl">একই ভার্সিটি বা একই বিষয়ে আগ্রহীদের সাথে টিমে কাজ করুন</h2><p className="mt-2 text-gray-600">গ্রুপ প্রজেক্ট, স্টাডি গ্রুপ বা একসাথে কাজ করার জন্য মানুষ খুঁজুন</p></div><button type="button" onClick={() => setShowGroupForm((value) => !value)} className="rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-yellow-600">নতুন গ্রুপ/টিম পোস্ট করুন</button></div>
            {showGroupForm && <form onSubmit={submitGroup} className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-yellow-200 bg-yellow-50 p-5 md:grid-cols-2"><input required placeholder="আপনার নাম" className={inputClass} /><input required placeholder="ভার্সিটি" className={inputClass} /><input required placeholder="সাবজেক্ট" className={inputClass} /><input required type="number" min="1" placeholder="কতজন লাগবে" className={inputClass} /><textarea required placeholder="কী নিয়ে কাজ করতে চান" className={`${inputClass} min-h-24 md:col-span-2`} /><button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white md:w-fit">পোস্ট করুন</button></form>}
            {groupSuccess && <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">আপনার গ্রুপ পোস্ট সফলভাবে প্রকাশের জন্য জমা হয়েছে</p>}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"><select value={universityFilter} onChange={(event) => setUniversityFilter(event.target.value)} className={inputClass}><option>সব বিশ্ববিদ্যালয়</option>{Array.from(new Set(groupPosts.map((post) => post.university))).map((university) => <option key={university}>{university}</option>)}</select><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className={inputClass}><option>সব বিষয়</option>{Array.from(new Set(groupPosts.map((post) => post.subject))).map((subject) => <option key={subject}>{subject}</option>)}</select></div>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{filteredGroups.map((post) => <article key={post.name} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-blue-950">{post.name}</h3><p className="mt-1 text-sm text-gray-500">{post.university} · {post.subject}</p><p className="mt-4 text-gray-700">{post.description}</p><p className="mt-4 font-semibold text-yellow-700">{post.needed}</p><button type="button" onClick={() => alert('আপনার যুক্ত হওয়ার অনুরোধ পাঠানো হয়েছে')} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-blue-800">যুক্ত হতে চাই</button></article>)}</div>{filteredGroups.length === 0 && <p className="mt-8 rounded-lg bg-gray-50 p-5 text-center text-gray-600">এই ফিল্টারে কোনো গ্রুপ পোস্ট পাওয়া যায়নি।</p>}
          </section>}
        </div>
      {(hireError || helperError || groupError) && (
        <div className="container mx-auto px-4 pb-6">
          {hireError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{hireError}</p>}
          {helperError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{helperError}</p>}
          {groupError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{groupError}</p>}
        </div>
      )}
      </main>
      <Footer />
    </div>
  )
}
