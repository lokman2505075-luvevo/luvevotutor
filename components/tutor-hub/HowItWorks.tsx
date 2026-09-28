import { BadgeCheck, ClipboardPenLine, SearchCheck } from 'lucide-react'

const steps = [
  { number: '১', title: 'রেজিস্টার করুন', text: 'আপনার তথ্য ও পড়ানোর বিষয়গুলো দিয়ে প্রোফাইল তৈরি করুন।', Icon: ClipboardPenLine },
  { number: '২', title: 'যাচাই ও অনুমোদন', text: 'আমাদের টিম আপনার প্রোফাইল দেখে অনুমোদনের প্রক্রিয়া সম্পন্ন করবে।', Icon: SearchCheck },
  { number: '৩', title: 'টিউশন সুযোগ পান', text: 'উপযুক্ত টিউশন সুযোগের সঙ্গে আপনার দক্ষতার মিল ঘটান।', Icon: BadgeCheck },
]

export default function HowItWorks() {
  return <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="max-w-xl"><p className="font-bold text-amber-600">সহজ তিন ধাপ</p><h2 className="mt-2 text-3xl font-bold text-blue-950 sm:text-4xl">শুরুটা হোক আজই</h2></div><div className="relative mt-10 grid gap-5 md:grid-cols-3 md:gap-8"><div className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-blue-200 md:block" />{steps.map(({ number, title, text, Icon }) => <article key={number} className="relative rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary"><Icon size={28} /></div><span className="absolute right-5 top-5 text-3xl font-bold text-blue-100">{number}</span></div><h3 className="mt-5 text-xl font-bold text-blue-950">{title}</h3><p className="mt-2 leading-7 text-slate-600">{text}</p></article>)}</div></div></section>
}
