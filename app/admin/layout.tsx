'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { REQUEST_CONFIGS } from '../../components/admin/requestConfig'
import { supabase } from '../../lib/supabaseClient'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/login')
  }, [isAdmin, loading, router, user])

  useEffect(() => {
    if (!isAdmin) return

    async function loadCounts() {
      const entries = await Promise.all(REQUEST_CONFIGS.map(async (config) => {
        if (!config.table) return [config.key, 0] as const
        const { count } = await supabase.from(config.table).select('id', { count: 'exact', head: true }).eq('status', 'new')
        return [config.key, count ?? 0] as const
      }))
      const { count: pendingJobs } = await supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: newApplications } = await supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('status', 'new')
      const { count: pendingReviews } = await supabase.from('guardian_reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false)
      const { count: pendingProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: pendingSohojatri } = await supabase.from('study_groups').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: openSohojatriReports } = await supabase.from('sohojatri_reports').select('id', { count: 'exact', head: true }).eq('status', 'open')
      const { count: pendingAssignmentHelpers } = await supabase.from('assignment_helpers').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: openAssignmentHelperReports } = await supabase.from('assignment_helper_reports').select('id', { count: 'exact', head: true }).eq('status', 'open')
      setCounts({ ...Object.fromEntries(entries), jobs: pendingJobs ?? 0, 'job-applications': newApplications ?? 0, reviews: pendingReviews ?? 0, products: pendingProducts ?? 0, sohojatri: (pendingSohojatri ?? 0) + (openSohojatriReports ?? 0), 'assignment-helpers': (pendingAssignmentHelpers ?? 0) + (openAssignmentHelperReports ?? 0) })
    }

    void loadCounts()
  }, [isAdmin])

  if (loading || !isAdmin) return <div className="min-h-screen bg-gray-50" />

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm lg:hidden">
        <Link href="/admin" className="text-lg font-bold text-primary">অ্যাডমিন প্যানেল</Link>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="মেনু খুলুন" className="rounded p-2 text-primary hover:bg-blue-50">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div className="flex min-h-screen">
        <aside className={`${menuOpen ? 'block' : 'hidden'} absolute inset-x-0 top-[58px] z-10 border-b bg-white p-4 shadow-lg lg:static lg:block lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5 lg:shadow-none`}>
          <div className="mb-6 hidden lg:block"><Link href="/admin" className="text-xl font-bold text-primary">অ্যাডমিন প্যানেল</Link></div>
          <nav className="space-y-1">
            {/* {REQUEST_CONFIGS.map((config) => {
              const active = pathname === `/admin/${config.key}`
              return <Link key={config.key} href={`/admin/${config.key}`} onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
                <span>{config.label}</span>
                {(counts[config.key] ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts[config.key]}</span>}
              </Link>
            })} */}
            {/* change for "ভর্তি পরামর্শ" এর জন্য একটা আলাদা URL (/admin/admission-requests) বানিয়ে দিলাম, যাতে দুটো মেনু আইটেম আর সংঘর্ষ না করে — প্রতিটার নিজস্ব আলাদা ঠিকানা থাকবে। */}
             {REQUEST_CONFIGS.map((config) => {
              const routeKey = config.key === 'admission' ? 'admission-requests' : config.key
              const active = pathname === `/admin/${routeKey}`
              return <Link key={config.key} href={`/admin/${routeKey}`} onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
                <span>{config.label}</span>
                {(counts[config.key] ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts[config.key]}</span>}
              </Link>
            })}
            <Link href="/admin/jobs" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/jobs' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>জব পোস্ট</span>
              {(counts.jobs ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts.jobs}</span>}
            </Link>
            <Link href="/admin/job-applications" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/job-applications' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>জব আবেদন</span>
              {(counts['job-applications'] ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts['job-applications']}</span>}
            </Link>
            <Link href="/admin/admission" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/admission' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>ভর্তি তথ্য</span>
            </Link>
            <Link href="/admin/reviews" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/reviews' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>Guardian Reviews</span>
              {(counts.reviews ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts.reviews}</span>}
            </Link>
            <Link href="/admin/courses" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/courses' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>কোর্স অনুমোদন</span>
            </Link>
            <Link href="/admin/course-payments" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/course-payments' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>কোর্স পেমেন্ট</span>
            </Link>
            <Link href="/admin/tutors" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/tutors' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>টিউটর অনুমোদন</span>
            </Link>
            <Link href="/admin/products" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/products' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>মার্কেটপ্লেস পণ্য</span>
              {(counts.products ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts.products}</span>}
            </Link>
            <Link href="/admin/marketplace-operations" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/marketplace-operations' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>মার্কেটপ্লেস অর্ডার / রিপোর্ট</span>
            </Link>
            <Link href="/admin/sohojatri" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/sohojatri' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>সহযাত্রী পরিচালনা</span>
              {(counts.sohojatri ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts.sohojatri}</span>}
            </Link>
            <Link href="/admin/assignment-helpers" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/assignment-helpers' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>হেল্পার পরিচালনা</span>
              {(counts['assignment-helpers'] ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{counts['assignment-helpers']}</span>}
            </Link>
            <Link href="/admin/education-support" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/education-support' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>শিক্ষা সহায়তা</span>
            </Link>
            <Link href="/admin/tutor-bookings" onClick={() => setMenuOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === '/admin/tutors' ? 'bg-blue-100 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span>টিউটর বুকিং অনুমোদন</span>
            </Link>
          </nav>
          <Link href="/" className="mt-8 block rounded-lg border border-gray-200 px-3 py-2 text-center text-sm text-gray-600 hover:bg-gray-50">সাইটে ফিরে যান</Link>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
