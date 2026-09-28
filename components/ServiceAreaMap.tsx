'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import BangladeshMap from './BangladeshMap'
import { DISTRICTS } from '@/lib/districts'
import { supabase } from '@/lib/supabaseClient'

const bengaliDigits = (value: number) => String(value).replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])

export default function ServiceAreaMap() {
  const [activeDistricts, setActiveDistricts] = useState<string[]>([])

  useEffect(() => {
    async function loadActiveDistricts() {
      const { data } = await supabase.from('public_tutors').select('district')
      const districts = Array.from(new Set((data ?? []).map((tutor) => tutor.district).filter((district): district is string => Boolean(district))))
      setActiveDistricts(districts)
    }

    void loadActiveDistricts()
  }, [])

  const activeDistrictRecords = DISTRICTS.filter((district) => activeDistricts.includes(district.value))
  return (
    <section className="py-12" aria-labelledby="service-area-title">
      <div className="mb-6 text-center"><span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-primary">আমাদের সেবার এলাকা</span><h2 id="service-area-title" className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">সারাদেশে আমাদের সেবা সমূহ</h2></div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div><BangladeshMap activeDistricts={activeDistricts} /><p className="mt-3 text-center text-sm text-gray-600">● নীল চিহ্নিত জেলায় বর্তমানে টিউটর সক্রিয় আছে — বাকি জেলাগুলোতেও শীঘ্রই সেবা চালু হবে</p></div>
        <aside className="rounded-xl bg-gray-50 p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-gray-900">বর্তমানে সক্রিয় জেলাসমূহ</h3><span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-primary">{bengaliDigits(activeDistrictRecords.length)}+ জেলা</span></div><div className="mt-5 flex flex-wrap gap-2">{activeDistrictRecords.map((district) => <Link key={district.value} href={`/tuition?district=${district.value}`} className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm text-primary transition hover:bg-blue-50">{district.label}</Link>)}</div><Link href="/contact" className="mt-7 block rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 text-center font-bold text-gray-900 shadow-sm transition hover:from-yellow-500 hover:to-amber-600">আপনার শহরে টিউটর দরকার? রিকোয়েস্ট দিন</Link></aside>
      </div>
    </section>
  )
}