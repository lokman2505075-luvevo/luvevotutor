 'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DISTRICTS_BY_DIVISION } from '../../lib/districts'
import { LEVELS } from '../../lib/levels'
import { SUBJECTS } from '../../lib/subjects'

type Props = { q?: string; district: string; subject: string; level: string; salary: string; sort: string }
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100'

export default function JobFilters({ q = '', district, subject, level, salary, sort }: Props) {
  const [values, setValues] = useState({ district, subject, level, salary, sort })
  useEffect(() => setValues({ district, subject, level, salary, sort }), [district, subject, level, salary, sort])
  return <details className="group rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
    <summary className="cursor-pointer list-none font-bold text-blue-950">ফিল্টার <span className="float-right text-sm font-normal text-slate-500 group-open:hidden">খুলুন</span><span className="float-right mr-2 hidden text-sm font-normal text-slate-500 group-open:inline">বন্ধ করুন</span></summary>
    <form action="/job-board" method="get" className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {q && <input type="hidden" name="q" value={q} />}
      <select name="district" value={values.district} onChange={(event) => setValues({ ...values, district: event.target.value })} className={inputClass}><option value="">সব জেলা</option>{DISTRICTS_BY_DIVISION.map(({ division, districts }) => <optgroup key={division} label={division}>{districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select>
      <select name="subject" value={values.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })} className={inputClass}><option value="">সব বিষয়</option>{SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select>
      <select name="level" value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value })} className={inputClass}><option value="">সব লেভেল</option>{LEVELS.map((item) => <option key={item}>{item}</option>)}</select>
      <select name="salary" value={values.salary} onChange={(event) => setValues({ ...values, salary: event.target.value })} className={inputClass}><option value="">সব বেতন</option><option value="under-3000">৩০০০-এর নিচে</option><option value="3000-5000">৩০০০–৫০০০</option><option value="over-5000">৫০০০+</option></select>
      <select name="sort" value={values.sort} onChange={(event) => setValues({ ...values, sort: event.target.value })} className={inputClass}><option value="newest">নতুন আগে</option><option value="salary">বেতন বেশি</option></select>
      <div className="flex gap-3"><button type="submit" className="min-h-11 flex-1 rounded-xl bg-primary px-5 py-2.5 font-bold text-white hover:bg-blue-800">খুঁজুন</button><Link href="/job-board" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">ফিল্টার মুছুন</Link></div>
    </form>
  </details>
}
