'use client'

import Link from 'next/link'
import MarketplaceApprovalTable from '../../../components/admin/MarketplaceApprovalTable'

export default function AdminMarketplacePage() {
  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">মার্কেটপ্লেস ব্যবস্থাপনা</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">পণ্য অনুমোদন</h1><p className="mt-2 text-gray-600">শিক্ষার্থী ও টিউটরদের জমা দেওয়া পণ্য যাচাই করে প্রকাশ করুন।</p></div><Link href="/educational-product/sell" className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600">Luvevo Official পণ্য যোগ করুন</Link></div>
    <MarketplaceApprovalTable />
  </div>
}
