"use client"

import Link from 'next/link'
import { useState, useRef } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Faq from '../../components/tutor-hub/Faq'
import { supabase } from '../../lib/supabaseClient'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState('সাধারণ প্রশ্ন')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const mapRef = useRef<HTMLIFrameElement | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) return alert('নাম ও ইমেইল দিন')
    setError('')
    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({ name, email, phone, subject: topic, message })
      if (insertError) {
        console.error(insertError)
        setError('মেসেজ পাঠানো যায়নি')
        return
      }
      setSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setTopic('সাধারণ প্রশ্ন')
      setMessage('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (error) {
      console.error(error)
      setError('মেসেজ পাঠানো যায়নি')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <section className="bg-gray-50 rounded-xl p-8 text-center shadow">
          <h1 className="text-3xl font-bold text-primary">যোগাযোগ করুন</h1>
          <p className="mt-3 text-gray-700">কোনো প্রশ্ন বা সাহায্যের প্রয়োজন হলে আমাদের সাথে যোগাযোগ করুন</p>
        </section>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow space-y-4">
            <h3 className="text-xl font-semibold">Contact Information</h3>

            <div className="flex items-center gap-3 p-3 border rounded">
              <div className="text-2xl">📞</div>
              <div>
                <div className="font-medium">ফোন / হোয়াটসঅ্যাপ</div>
                <a href="https://wa.me/8801843383301" className="text-primary">01843383301 (WhatsApp)</a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <div className="text-2xl">✉️</div>
              <div>
                <div className="font-medium">ইমেইল</div>
                <a href="mailto:luvevoofficial@gmail.com" className="text-primary">luvevoofficial@gmail.com</a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <div className="text-2xl">📍</div>
              <div>
                <div className="font-medium">ঠিকানা</div>
                <div>Bangladesh Agricultural University, Mymensingh</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="text-xl font-semibold mb-4">যোগাযোগ ফর্ম</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম" className="w-full p-2 border rounded" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ইমেইল" className="w-full p-2 border rounded" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ফোন নাম্বার" className="w-full p-2 border rounded" />
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-2 border rounded">
                <option>সাধারণ প্রশ্ন</option>
                <option>টিউটর সংক্রান্ত</option>
                <option>সার্ভিস সংক্রান্ত</option>
                <option>অভিযোগ</option>
              </select>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ" className="w-full p-2 border rounded" />
              <div>
                <button disabled={submitting} type="submit" className="bg-primary text-white px-4 py-2 rounded disabled:opacity-60">{submitting ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠান'}</button>
              </div>
            </form>

            {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">আপনার মেসেজ পাঠানো হয়েছে, শীঘ্রই যোগাযোগ করা হবে</div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-xl font-semibold mb-4">আমাদের অবস্থান</h3>
          <div className="overflow-hidden rounded-xl shadow">
            <iframe
              ref={mapRef}
              src="https://maps.google.com/maps?q=Bangladesh+Agricultural+University,+Mymensingh&output=embed"
              width="100%"
              height={380}
              loading="lazy"
              aria-hidden="false"
            />
          </div>
        </section>

        <Faq />
      </main>

      <Footer />
    </div>
  )
}
