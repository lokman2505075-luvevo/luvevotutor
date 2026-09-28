"use client"

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Phone,
  Play,
  Printer,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

export default function PrintingPage() {
  const [docType, setDocType] = useState('নোট')
  const [copies, setCopies] = useState(1)
  const [color, setColor] = useState('কালার')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!phone) {
      setError('ফোন নাম্বার দিন')
      return
    }

    setSubmitting(true)
    const { error: insertError } = await supabase.from('print_orders').insert({
      name,
      document_type: docType,
      copies,
      color_option: color,
      address,
      phone,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setDocType('নোট')
    setCopies(1)
    setColor('কালার')
    setName('')
    setAddress('')
    setPhone('')
    setSuccess(true)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main>
        <section className="relative overflow-hidden bg-blue-50">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-yellow-400/20 [clip-path:polygon(45%_0,100%_0,100%_100%,0_100%)]" />
          <div className="container relative mx-auto grid grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-950">শিক্ষার্থীদের জন্য সহজ প্রিন্টিং</p>
              <h1 className="max-w-xl text-4xl font-bold leading-tight text-blue-950 md:text-6xl">সাশ্রয়ী প্রিন্টিং সল্যুশন</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-gray-700">আপনার নোট, অ্যাসাইনমেন্ট ও বই প্রিন্ট করুন দ্রুত, নির্ভরযোগ্যভাবে এবং আপনার বাজেটের মধ্যে। অর্ডার করুন অনলাইনে, পৌঁছে যাবে আপনার ঠিকানায়।</p>
              <a href="#order-form" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-800 px-6 py-3 font-bold text-white transition hover:bg-blue-900">এখনই অর্ডার করুন <ArrowRight size={18} /></a>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-3xl bg-blue-800 p-6 shadow-2xl shadow-blue-900/20">
                <div className="rounded-2xl bg-white p-7">
                  <Printer className="h-20 w-20 text-blue-800" strokeWidth={1.5} />
                  <div className="mt-8 h-3 w-4/5 rounded bg-gray-200" />
                  <div className="mt-3 h-3 w-3/5 rounded bg-gray-200" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-yellow-400" />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-bold text-white"><span>আজকের সেরা দাম</span><span className="rounded-full bg-yellow-400 px-3 py-1 text-blue-950">দ্রুত ডেলিভারি</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center"><p className="font-bold text-yellow-600">কেন আমাদের বেছে নেবেন</p><h2 className="mt-2 text-3xl font-bold text-blue-950 md:text-4xl">প্রিন্টিং হবে আরও সহজ</h2></div>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-4">
            {[
              { icon: Printer, title: 'মানসম্মত প্রিন্ট', text: 'ঝকঝকে ও পরিষ্কার প্রিন্টে আপনার কাজ আরও সুন্দর হোক।' },
              { icon: Truck, title: 'দ্রুত ডেলিভারি', text: 'সময়মতো আপনার দরজায় পৌঁছে যাবে সম্পূর্ণ অর্ডার।' },
              { icon: CreditCard, title: 'সাশ্রয়ী মূল্য', text: 'শিক্ষার্থীবান্ধব দামে পান প্রয়োজনীয় সব প্রিন্টিং সুবিধা।' },
              { icon: ShieldCheck, title: 'নিরাপদ সেবা', text: 'আপনার ডকুমেন্টের গোপনীয়তা ও নিরাপত্তা আমাদের অগ্রাধিকার।' },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-800"><Icon size={25} /></div><h3 className="text-lg font-bold text-blue-950">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{text}</p></div>)}
          </div>
        </section>

        <section className="bg-blue-50 py-16 md:py-20">
          <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 md:grid-cols-2">
            <div>
              <p className="font-bold text-yellow-600">সহজ তিন ধাপ</p>
              <h2 className="mt-2 text-3xl font-bold text-blue-950 md:text-4xl">কীভাবে কাজ করে</h2>
              <p className="mt-6 leading-7 text-gray-700">নোট, ক্লাসনোট বা লেকচার শিট প্রিন্ট করতে অনেক সময় দোকানে যেতে হয় এবং বেশি খরচও পড়ে। Luvevo Tutor আপনার ফাইল সংগ্রহ করে সাশ্রয়ী মূল্যে মানসম্মত প্রিন্ট সরাসরি আপনার ঠিকানায় পৌঁছে দেয়।</p>
              <p className="mt-4 leading-7 text-gray-700">ফর্মে তথ্য দিয়ে অর্ডার করুন, আর একসাথে বেশি পেজ প্রিন্ট করলে পান আরও কম প্রতি-পেজ মূল্য।</p>
              <div className="mt-8 space-y-6">{['ফর্মে আপনার ডকুমেন্টের তথ্য ও ঠিকানা দিন।', 'আপনার প্রয়োজন অনুযায়ী কপি ও প্রিন্টের ধরন বেছে নিন।', 'অর্ডার নিশ্চিত হলে আমরা প্রিন্ট করে আপনার ঠিকানায় পাঠিয়ে দেব।'].map((step, index) => <div key={step} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-bold text-blue-950">{index + 1}</span><p className="pt-1 text-gray-700">{step}</p></div>)}</div>
              <div className="mt-8 border-l-4 border-yellow-500 bg-blue-50 p-5">
                <h3 className="font-bold text-blue-950">নির্দেশনা:</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-gray-700">
                  {[
                    'আপলোড করা ফাইলের লিংক এক্সেসযোগ্য (public/shareable) কিনা আগে চেক করে নিন',
                    'ব্ল্যাক অ্যান্ড হোয়াইট প্রিন্টের জন্য ফাইলের কালার ইনভার্ট করে আপলোড করলে খরচ কম হবে',
                    'ক্লাসনোট/স্লাইড প্রিন্টের ক্ষেত্রে প্রতি ৪ পেজকে ১ পেজ হিসেবে গণনা করা হয় (পেজ সংখ্যা ভগ্নাংশ হলে তার পরবর্তী পূর্ণ সংখ্যা ধরা হবে)',
                    'অর্ডারের সময় সঠিক ফোন নাম্বার ও ঠিকানা দিতে ভুলবেন না',
                    'একসাথে বেশি পেজ (১০০-২০০+) প্রিন্ট করলে প্রতি পেজের খরচ কমে যায়',
                  ].map((instruction) => <li key={instruction} className="flex gap-2"><CheckCircle2 className="mt-1 shrink-0 text-yellow-600" size={16} /> <span>{instruction}</span></li>)}
                </ul>
                <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:gap-5">
                  <a href="https://www.ilovepdf.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-yellow-700 underline transition hover:text-yellow-900">PDF কালার ইনভার্ট করুন</a>
                  <a href="https://www.ilovepdf.com/merge_pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-yellow-700 underline transition hover:text-yellow-900">একাধিক PDF মার্জ করুন</a>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-blue-950 p-8 shadow-xl"><div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,64,175,.9),rgba(15,23,42,.96))]" /><div className="relative flex min-h-[270px] flex-col justify-between"><span className="w-fit rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-blue-950">প্রিন্টিং গাইড</span><div className="text-white"><button type="button" aria-label="ভিডিও চালু করুন" className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-blue-950 transition hover:scale-105"><Play size={23} fill="currentColor" /></button><h3 className="text-2xl font-bold">আপনার অর্ডার যেভাবে পৌঁছাবে</h3><p className="mt-2 text-blue-100">সহজ অর্ডার, নির্ভরযোগ্য সেবা</p></div></div></div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:py-20"><div className="grid grid-cols-1 gap-12 md:grid-cols-2"><div><p className="font-bold text-yellow-600">আপনার সুবিধাই প্রথম</p><h2 className="mt-2 text-3xl font-bold text-blue-950">কেন লুভেভো টিউটর?</h2><div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">{[{ icon: Printer, title: 'প্রফেশনাল প্রিন্ট' }, { icon: Truck, title: 'সময়মতো ডেলিভারি' }, { icon: Wallet, title: 'বাজেটবান্ধব দাম' }, { icon: ShieldCheck, title: 'বিশ্বস্ত গোপনীয়তা' }].map(({ icon: Icon, title }) => <div key={title} className="flex items-center gap-3"><span className="text-blue-800"><Icon size={22} /></span><span className="font-semibold text-gray-700">{title}</span></div>)}</div></div><div className="flex items-center justify-between gap-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-6"><div><h3 className="text-xl font-bold text-blue-950">সাহায্য দরকার?</h3><p className="mt-2 text-gray-600">অর্ডার নিয়ে যেকোনো প্রশ্নে আমাদের সাথে কথা বলুন।</p><Link href="/contact" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-800">যোগাযোগ করুন <ArrowRight size={17} /></Link></div><Phone className="shrink-0 text-yellow-600" size={42} /></div></div></section>

        <section id="order-form" className="bg-gray-50 py-16 md:py-20"><div className="container mx-auto px-4"><div className="mx-auto max-w-2xl"><div className="mb-8 text-center"><p className="font-bold text-yellow-600">শুরু করি</p><h2 className="mt-2 text-3xl font-bold text-blue-950">আপনার প্রিন্টিং অর্ডার দিন</h2><p className="mt-2 text-gray-600">তথ্যগুলো পূরণ করুন, আমরা দ্রুত আপনার সাথে যোগাযোগ করব।</p></div><div className="rounded-2xl bg-white p-6 shadow-lg md:p-8"><form onSubmit={handleSubmit} className="space-y-5"><div><label className="mb-1 block font-medium text-gray-700">ডকুমেন্ট টাইপ</label><select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"><option>নোট</option><option>অ্যাসাইনমেন্ট</option><option>বুক</option></select></div><div><label className="mb-1 block font-medium text-gray-700">কপি সংখ্যা</label><input type="number" value={copies} min={1} onChange={(e) => setCopies(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700" /></div><div><label className="mb-2 block font-medium text-gray-700">কালার / ব্ল্যাক-হোয়াইট</label><div className="flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="radio" name="color" checked={color === 'কালার'} onChange={() => setColor('কালার')} /> কালার</label><label className="flex items-center gap-2"><input type="radio" name="color" checked={color === 'ব্ল্যাক-হোয়াইট'} onChange={() => setColor('ব্ল্যাক-হোয়াইট')} /> ব্ল্যাক-হোয়াইট</label></div></div><div><label className="mb-1 block font-medium text-gray-700">ঠিকানা</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-28 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700" /></div><div><label className="mb-1 block font-medium text-gray-700">ফোন নাম্বার</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700" /></div><button disabled={submitting} type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 py-3 font-bold text-white transition hover:bg-blue-900 disabled:opacity-60">{submitting ? 'পাঠানো হচ্ছে...' : 'অর্ডার করুন'} <ArrowRight size={18} /></button></form>{error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}{success && <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"><CheckCircle2 size={20} /> আপনার অর্ডার গ্রহণ করা হয়েছে, শীঘ্রই যোগাযোগ করা হবে</div>}</div></div></div></section>
      </main>

      <Footer />
    </div>
  )
}
