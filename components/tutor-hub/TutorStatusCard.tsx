import Link from 'next/link'
import { ArrowRight, Clock3, LogOut, ShieldCheck } from 'lucide-react'
import type { Profile } from '../../lib/AuthContext'
import { useAuth } from '../../lib/AuthContext'

export default function TutorStatusCard({ profile }: { profile: Profile | null }) {
  const { signOut } = useAuth()
  if (profile?.role === 'tutor') return <section className="rounded-2xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-950/5 sm:p-12"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-primary">{profile.status === 'approved' ? <ShieldCheck size={34} /> : <Clock3 size={34} />}</div><h2 className="mt-6 text-2xl font-bold text-blue-950">{profile.status === 'approved' ? 'আপনার প্রোফাইল অনুমোদিত' : 'আপনার প্রোফাইল অনুমোদনের অপেক্ষায় আছে'}</h2><p className="mt-3 max-w-xl leading-8 text-slate-600">আপনার অ্যাকাউন্টে লগইন করা আছে। প্রোফাইলের তথ্য পরিবর্তন করতে নিচের লিংকে যান।</p><Link href="/profile" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-blue-800">আমার প্রোফাইল <ArrowRight size={18} /></Link></section>
  return <section className="rounded-2xl border border-amber-100 bg-white p-8 shadow-xl shadow-blue-950/5 sm:p-12"><h2 className="text-2xl font-bold text-blue-950">এই ফর্মটি টিউটর রেজিস্ট্রেশনের জন্য</h2><p className="mt-3 leading-8 text-slate-600">আপনি ইতিমধ্যে অন্য ধরনের অ্যাকাউন্টে লগইন করা আছেন। টিউটর হিসেবে আবেদন করতে আগে লগআউট করুন।</p><button type="button" onClick={() => void signOut()} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-amber-500"><LogOut size={18} /> লগআউট করুন</button></section>
}
