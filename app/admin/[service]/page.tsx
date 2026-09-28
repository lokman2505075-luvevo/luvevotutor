'use client'

import Link from 'next/link'
import RequestTable from '../../../components/admin/RequestTable'
import { getRequestConfig } from '../../../components/admin/requestConfig'

export default function AdminServicePage({ params }: { params: { service: string } }) {
  const config = getRequestConfig(params.service)

  if (!config) return <div className="rounded-xl bg-white p-10 text-center"><h1 className="text-xl font-bold">সার্ভিস পাওয়া যায়নি</h1><Link href="/admin" className="mt-4 inline-block text-primary">ড্যাশবোর্ডে ফিরুন</Link></div>

  return <div><div className="mb-6"><Link href="/admin" className="text-sm text-primary hover:underline">ড্যাশবোর্ড</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">{config.label}</h1><p className="mt-1 text-gray-600">রিকোয়েস্ট দেখুন, ফিল্টার করুন এবং দ্রুত আপডেট করুন।</p></div><RequestTable config={config} /></div>
}
