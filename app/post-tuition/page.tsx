'use client'

import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import JobPostForm from '../../components/job-board/JobPostForm'
import AudienceCard from '../../components/AudienceCard'
import { useRole } from '../../lib/useRole'

export default function PostTuitionPage() {
  const { loading, role, profile } = useRole()
  if (loading) return <><Navbar /><main className="min-h-[70vh] animate-pulse bg-slate-50" /><Footer /></>
  return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar /><main><section className="bg-gradient-to-br from-blue-950 via-blue-900 to-primary px-4 py-16 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><p className="font-bold text-amber-300">অভিভাবকদের জন্য</p><h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">টিউটর দরকার? আপনার টিউশন পোস্ট করুন</h1><p className="mt-4 max-w-2xl leading-8 text-blue-100">আপনার প্রয়োজন জানালে যাচাইয়ের পর উপযুক্ত টিউটররা আবেদন করতে পারবেন।</p></div></section><section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8"><Step number="১" text="পোস্ট করুন" /><Step number="২" text="যাচাই ও প্রকাশ" /><Step number="৩" text="টিউটরের আবেদন ও Luvevo-র যোগাযোগ" /></section><div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">{role === 'tutor' ? <AudienceCard title="এই ফর্মটি অভিভাবকদের জন্য" body="টিউটর হিসেবে আপনি জব বোর্ড দেখে আবেদন করতে পারবেন।" links={[{ label: 'জব বোর্ড দেখুন', href: '/job-board' }, { label: 'আমার আবেদন', href: '/my-applications' }]} /> : <>{role === 'guest' && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">লগইন করলে আপনার পোস্টের অবস্থা দেখতে পারবেন। <Link href="/login?next=/post-tuition" className="font-bold underline">লগইন করুন</Link> অথবা <Link href="/register" className="font-bold underline">রেজিস্টার করুন</Link></div>}<div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><p className="font-bold text-amber-600">অভিভাবকদের জন্য</p><h2 className="mt-1 text-2xl font-bold text-blue-950">নতুন জব পোস্ট করুন</h2><p className="mt-2 text-slate-600">পোস্ট যাচাই করে অনুমোদনের পর জব বোর্ডে প্রকাশ করা হবে।</p><div className="mt-7"><JobPostForm initialName={profile?.full_name ?? ''} initialPhone={profile?.phone ?? ''} /></div></div></>}</div></main><Footer /></div>
}

function Step({ number, text }: { number: string; text: string }) { return <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><span className="text-2xl font-bold text-amber-500">{number}</span><p className="mt-2 font-semibold text-blue-950">{text}</p></div> }
