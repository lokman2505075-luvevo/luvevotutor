import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Sparkles } from 'lucide-react'

export default function Hero({ onRegister }: { onRegister: () => void }) {
  return <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-primary px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
    <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10" aria-hidden="true" />
    <div className="absolute bottom-[-7rem] left-[-4rem] h-64 w-64 rounded-full border-[22px] border-amber-300/10" aria-hidden="true" />
    <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
      <div className="animate-rise">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-blue-100"><Sparkles size={16} /> দক্ষতা থেকে সম্ভাবনার পথে</div>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">টিউটর হাব – আপনার টিউটরিং ক্যারিয়ার শুরু করুন</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100 sm:text-lg">আপনার জ্ঞান ও অভিজ্ঞতাকে অর্থবহ সুযোগে রূপ দিন। Luvevo Tutor-এ প্রোফাইল তৈরি করে শিক্ষার্থীদের কাছে পৌঁছান।</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onRegister} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-white shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200/60">টিউটর হিসেবে রেজিস্টার করুন <ArrowRight size={18} /></button>
          <Link href="/job-board" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-white/30"><BriefcaseBusiness size={18} /> টিউশন জব দেখুন</Link>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-md animate-float" aria-label="টিউটর ও শিক্ষার্থীর সংযোগের অলংকারিক চিত্র" role="img">
        <div className="absolute inset-8 rounded-[2rem] bg-amber-300/20 blur-2xl" />
        <div className="relative rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-blue-950 shadow-lg"><div><p className="text-xs font-semibold uppercase text-blue-500">Tutor profile</p><p className="mt-1 font-bold">আপনার পরিচয়, আপনার শক্তি</p></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">✦</div></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-blue-950/60 p-4"><div className="h-2 w-16 rounded bg-amber-300" /><div className="mt-3 h-2 w-24 rounded bg-white/30" /><div className="mt-2 h-2 w-20 rounded bg-white/20" /></div><div className="rounded-2xl bg-white/10 p-4"><div className="mx-auto h-10 w-10 rounded-full border-4 border-amber-300/70" /><div className="mt-3 h-2 w-full rounded bg-white/30" /><div className="mt-2 h-2 w-2/3 rounded bg-white/20" /></div></div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-300 p-4 font-semibold text-blue-950"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70">✓</span> যাচাই শেষে সুযোগের পথে এগিয়ে যান</div>
        </div>
      </div>
    </div>
  </section>
}
