"use client"

import Link from 'next/link'
import { BookOpen, FileCheck, FileText, GraduationCap, Laptop, Package, Printer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Card = {
  title: string
  desc: string
  btn: string
  href: string
  icon: LucideIcon
  accent: string
}

const cards: Card[] = [
  { title: 'Tuition Media', desc: 'ভেরিফাইড টিউটর ও টিউশন খুঁজুন', btn: 'টিউটর খুঁজুন', href: '/tuition', icon: GraduationCap, accent: 'bg-blue-500' },
  { title: 'Printing', desc: 'নোট, বই, অ্যাসাইনমেন্ট প্রিন্ট করুন সহজে', btn: 'অর্ডার করুন', href: '/printing', icon: Printer, accent: 'bg-orange-500' },
  { title: 'Admission Service and Consultancy', desc: 'ভর্তি সংক্রান্ত সঠিক পরামর্শ নিন', btn: 'পরামর্শ নিন', href: '/admission-consultancy', icon: FileCheck, accent: 'bg-emerald-500' },
  { title: 'Book and Course Affiliate', desc: 'সেরা বই ও কোর্স খুঁজুন', btn: 'দেখুন', href: '/book-course-affiliate', icon: BookOpen, accent: 'bg-violet-500' },
  { title: 'Educational Product', desc: 'শিক্ষা উপকরণ কিনুন', btn: 'শপ করুন', href: '/educational-product', icon: Package, accent: 'bg-cyan-500' },
  { title: 'Assignment and Project Work', desc: 'অ্যাসাইনমেন্ট ও প্রজেক্টে সাহায্য নিন', btn: 'সাহায্য নিন', href: '/assignment-project', icon: FileText, accent: 'bg-rose-500' },
  { title: 'Online Courses and Tuition', desc: 'কোর্স কিনুন বা লাইভ টিউশন বুক করুন', btn: 'শুরু করুন', href: '/online-courses', icon: Laptop, accent: 'bg-indigo-500' }
]

export default function ServicesGrid() {

  return (
    <section className="py-12">
      <h3 className="text-2xl font-semibold text-center mb-6">আমাদের সার্ভিসসমূহ</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon

          return (
          <div key={c.title} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl">
            <div className={`h-1 w-full ${c.accent}`} />
            <div className="p-6">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md">
                <Icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <h4 className="font-semibold text-slate-900">{c.title}</h4>
              <p className="mt-2 text-gray-600">{c.desc}</p>
              <Link href={c.href} className="mt-5 inline-block rounded bg-accent px-4 py-2 font-medium text-white transition-all duration-300 hover:scale-105 hover:bg-orange-600">{c.btn}</Link>
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}
