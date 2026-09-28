"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: identifier, password })
    if (loginError) {
      setError(loginError.message)
      setSubmitting(false)
      return
    }
    const { data: freshProfile } = await supabase.from('profiles').select('role').eq('id', data.user?.id ?? '').maybeSingle()
    const next = searchParams.get('next')
    if (next?.startsWith('/')) router.push(next)
    else if (freshProfile?.role === 'admin') router.push('/admin')
    else if (freshProfile?.role === 'tutor') router.push('/job-board')
    else router.push('/tutors')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <Link href="/" className="inline-block text-2xl font-bold text-primary">Luvevo Tutor</Link>
        </header>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-semibold text-center text-primary">লগইন করুন</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ইমেইল</label>
                <input required type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="ইমেইল" className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">পাসওয়ার্ড</label>
              <div className="relative">
                <input required type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="পাসওয়ার্ড" className="w-full p-2 border rounded pr-12 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary">
                  {show ? 'লুকান' : 'দেখান'}
                </button>
              </div>
            </div>

            <div>
              <button disabled={submitting} type="submit" className="w-full bg-primary text-white py-2 rounded disabled:opacity-60">{submitting ? 'অপেক্ষা করুন...' : 'লগইন করুন'}</button>
            </div>

            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="flex justify-between items-center text-sm">
              <a href="#" className="text-primary/90">পাসওয়ার্ড ভুলে গেছেন?</a>
              <Link href="/register" className="text-primary font-medium">একাউন্ট নেই? রেজিস্টার করুন</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><LoginForm /></Suspense>
}
