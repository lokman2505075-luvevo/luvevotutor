"use client"

import { useState, type FormEvent } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'
import SohojatriBoard from '../../components/sohojatri/SohojatriBoard'
import AssignmentHelperDirectory from '../../components/assignment/AssignmentHelperDirectory'
import AssignmentHelperRegistration from '../../components/assignment/AssignmentHelperRegistration'
import AssignmentHelperInbox from '../../components/assignment/AssignmentHelperInbox'

type Tab = 'hire' | 'help' | 'group'

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100'

export default function AssignmentProjectPage() {
  const [tab, setTab] = useState<Tab>('hire')
  const [hireSuccess, setHireSuccess] = useState(false)
  const [hireError, setHireError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="bg-blue-50 px-4 py-12 md:py-16">
          <div className="container mx-auto text-center">
            <p className="font-semibold text-yellow-600">সহযোগিতায় এগিয়ে যান</p>
            <h1 className="mt-2 text-3xl font-bold text-blue-950 md:text-5xl">অ্যাসাইনমেন্ট ও প্রজেক্ট সহায়তা</h1>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">আপনার কাজের জন্য সাহায্যকারী খুঁজুন, নিজের দক্ষতা দিয়ে অন্যদের সাহায্য করুন, অথবা সহযাত্রী খুঁজে একসাথে এগিয়ে যান।</p>
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 rounded-xl bg-white p-2 shadow-sm">
              {[
                { id: 'hire' as Tab, label: 'সাহায্য নিন' },
                { id: 'help' as Tab, label: 'সাহায্য দিন' },
                { id: 'group' as Tab, label: 'সহযাত্রী' },
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

            <AssignmentHelperDirectory onJoinHelpers={() => setTab('help')} />
            <AssignmentHelperInbox />
          </section>}

          {tab === 'help' && <>
            <AssignmentHelperRegistration />
            <AssignmentHelperInbox />
          </>}

          {tab === 'group' && <SohojatriBoard />}
        </div>
      {hireError && (
        <div className="container mx-auto px-4 pb-6">
          {hireError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{hireError}</p>}
        </div>
      )}
      </main>
      <Footer />
    </div>
  )
}
