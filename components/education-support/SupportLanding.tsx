'use client'

import Link from 'next/link'
import { BookOpen, HandHeart, ShieldCheck } from 'lucide-react'
import Footer from '../Footer'
import Navbar from '../Navbar'

const faqs = [
  ['কারা সহায়তার জন্য আবেদন করতে পারবেন?', 'আর্থিকভাবে অসচ্ছল শিক্ষার্থীর অভিভাবক বা শিক্ষার্থী নিজে আবেদন করতে পারবেন।'],
  ['কী ধরনের সহায়তা পাওয়া যাবে?', 'বিনামূল্যে পড়ানোর সহায়তা অথবা বই ও শিক্ষা উপকরণের সহায়তা চাওয়া যাবে।'],
  ['আবেদনের পর কী হবে?', 'আমাদের প্রশাসক তথ্য যাচাই করে উপযুক্ত স্বেচ্ছাসেবকের সঙ্গে যোগাযোগ করাবেন।'],
]

export default function SupportLanding() {
  return <div className="min-h-screen bg-white text-slate-900">
    <Navbar />
    <main>
      <section className="bg-gradient-to-br from-blue-950 to-blue-800 px-4 py-16 text-center text-white md:py-24">
        <div className="mx-auto max-w-4xl">
          <HandHeart className="mx-auto h-12 w-12 text-amber-300" aria-hidden="true" />
          <p className="mt-4 font-semibold text-amber-300">পাশে থাকি, এগিয়ে যাই</p>
          <h1 className="mt-2 text-4xl font-bold md:text-6xl">শিক্ষা সহায়তা</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">আর্থিকভাবে অসচ্ছল শিক্ষার্থীর পড়াশোনায় পাশে দাঁড়াই—বিনামূল্যে পড়ানো, বই ও শিক্ষা উপকরণ দিয়ে।</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/education-support/request" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-blue-950 hover:bg-amber-300">সাহায্য চাই</Link>
            <Link href="/education-support/volunteer" className="rounded-xl border border-white/60 px-6 py-3 font-bold text-white hover:bg-white/10">সাহায্য করতে চাই</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-12 md:grid-cols-3">
        {[['পড়াশোনায় সহায়তা', 'স্বেচ্ছাসেবী শিক্ষক বা টিউটরের কাছ থেকে বিনামূল্যে পড়ার সুযোগ।'], ['বই ও উপকরণ', 'বই, খাতা ও প্রয়োজনীয় শিক্ষা উপকরণ পেতে আবেদন করুন।'], ['যাচাইকৃত সংযোগ', 'প্রশাসক আবেদন যাচাই করে উপযুক্ত সহায়তাকারীর সঙ্গে পরিচয় করিয়ে দেন।']].map(([title, description]) =>
          <article key={title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><BookOpen className="h-8 w-8 text-primary" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold text-blue-950">{title}</h2><p className="mt-2 leading-7 text-slate-600">{description}</p></article>
        )}
      </section>

      <section className="bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-blue-950">সাধারণ জিজ্ঞাসা</h2>
          <div className="mt-5 space-y-3">{faqs.map(([question, answer]) => <article key={question} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-blue-950">{question}</h3><p className="mt-2 leading-7 text-slate-600">{answer}</p></article>)}</div>
        </div>
      </section>

      <aside className="mx-auto my-10 flex max-w-4xl gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <ShieldCheck className="h-7 w-7 shrink-0" aria-hidden="true" />
        <div><h2 className="font-bold">আপনার গোপনীয়তা ও যাচাই</h2><p className="mt-1 text-sm leading-6">শিক্ষার্থীর নাম, ঠিকানা ও অভিভাবকের যোগাযোগের তথ্য প্রকাশ্যে দেখানো হয় না। যাচাইয়ের জন্য তথ্য কেবল প্রশাসক দেখবেন; প্রশাসক মিল করানোর পর নির্ধারিত স্বেচ্ছাসেবক সীমিত যোগাযোগের তথ্য পাবেন।</p></div>
      </aside>
    </main>
    <Footer />
  </div>
}
