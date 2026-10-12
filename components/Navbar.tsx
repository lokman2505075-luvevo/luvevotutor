"use client"

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../lib/AuthContext'
import { useRole, type AudienceRole } from '../lib/useRole'
import UserAvatar from './UserAvatar'
import Image from 'next/image'

type NavItem = { label: string; href?: string; children?: NavItem[] }

const services: NavItem[] = [
  { label: 'টিউশন মিডিয়া', href: '/tuition' },
  { label: 'প্রিন্টিং', href: '/printing' },
  { label: 'ভর্তি পরামর্শ ও কনসালটেন্সি', href: '/admission-consultancy' },
  { label: 'শিক্ষা সহায়তা', href: '/education-support' },
  { label: 'শিক্ষা পণ্য', href: '/educational-product' },
  { label: 'অ্যাসাইনমেন্ট ও সহযাত্রী', href: '/assignment-project' },
  { label: 'অনলাইন কোর্স ও টিউশন', href: '/online-courses' },
]
const guardians: NavItem = { label: 'অভিভাবকদের জন্য', children: [{ label: 'টিউটর খুঁজুন', href: '/tutors' }, { label: 'টিউশন পোস্ট করুন', href: '/post-tuition'}, { label: 'আমার কোর্স', href: '/my-courses'} ] }
const tutors: NavItem = { label: 'টিউটরদের জন্য', children: [{ label: 'টিউটর হিসেবে যুক্ত হোন', href: '/tutor-hub' }, { label: 'জব বোর্ড', href: '/job-board' }] }

const commonItems: NavItem[] = [{ label: 'Home', href: '/' }, { label: 'Services', children: services }]
const roleMenus: Record<AudienceRole, NavItem[]> = {
  guest: [...commonItems, guardians, tutors, { label: 'About Us', href: '/about' }, { label: 'Contact', href: '/contact' }],
  guardian: [...commonItems, { label: 'টিউটর খুঁজুন', href: '/tutors' }, { label: 'টিউশন পোস্ট করুন', href: '/post-tuition' }, { label: 'আমার পোস্ট', href: '/my-posts' }, { label: 'আমার কোর্স', href: '/my-courses'}, { label: 'About Us', href: '/about' }, { label: 'Contact', href: '/contact' }],
  student: [{ label: 'হোম', href: '/' }, { label: 'সেবাসমূহ', children: services }, { label: 'টিউটর খুঁজুন', href: '/tutors' }, { label: 'আমার কোর্স', href: '/my-courses#courses' }, { label: 'আমার উপস্থিতি', href: '/my-courses#attendance' }, { label: 'আমার প্রোফাইল', href: '/profile' }, { label: 'পরিচিতি', href: '/about' }, { label: 'যোগাযোগ', href: '/contact' }],
  tutor: [...commonItems, { label: 'জব বোর্ড', href: '/job-board' }, { label: 'আমার আবেদন', href: '/my-applications' }, { label: 'উপস্থিতি', href: '/profile#attendance' }, { label: 'আমার প্রোফাইল', href: '/profile' }, { label: 'About Us', href: '/about' }, { label: 'Contact', href: '/contact' }],
  admin: [...commonItems, guardians, tutors, { label: 'About Us', href: '/about' }, { label: 'Contact', href: '/contact' }, { label: 'অ্যাডমিন প্যানেল', href: '/admin' }],
}

function NavEntry({ item, pathname, mobile = false, horizontal = false }: { item: NavItem; pathname: string; mobile?: boolean; horizontal?: boolean }) {
  const [open, setOpen] = useState(false)
  const active = Boolean(item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
  if (item.children) return <div className={mobile ? 'border-b border-slate-100' : 'relative'}>
    <button type="button" onClick={() => setOpen((value) => !value)} className={`flex min-h-10 items-center gap-1 font-semibold ${mobile ? 'w-full justify-between px-4 py-3 text-left' : 'whitespace-nowrap rounded-lg px-2 py-2'} ${open ? 'text-primary' : 'text-slate-700'}`} aria-expanded={open}>{item.label}<ChevronDown size={16} className={open ? 'rotate-180' : ''} /></button>
    {open && <div className={mobile ? 'space-y-1 border-t border-slate-100 bg-slate-50 px-6 py-2' : horizontal ? 'absolute left-1/2 top-full z-20 mt-1 w-[min(90vw,1100px)] -translate-x-1/2 overflow-x-auto rounded-b-2xl border border-slate-100 bg-white p-3 shadow-xl' : 'absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-100 bg-white p-2 shadow-xl'}><div className={horizontal ? 'flex min-w-max items-center justify-start gap-6' : undefined}>{item.children.map((child) => <NavEntry key={child.href ?? child.label} item={child} pathname={pathname} mobile={mobile} />)}</div></div>}
  </div>
  return <Link href={item.href ?? '#'} className={`${mobile ? 'block border-b border-slate-100 px-4 py-3' : 'whitespace-nowrap rounded-lg px-2 py-2'} font-semibold ${active ? 'bg-blue-50 text-primary' : 'text-slate-700 hover:text-primary'}`}>{item.label}</Link>
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, role, profile } = useRole()
  const { signOut, user } = useAuth()
  const [open, setOpen] = useState(false)
  const items = roleMenus[role]

  async function handleLogout() {
    await signOut()
    router.push('/')
  }

  const displayName = profile?.full_name || user?.email || ''
  const photoUrl = (profile as any)?.photo_url ?? null

  return <header className="bg-white shadow-sm">
    <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
      {/* Logo for Luvevo Tutor  */}
     <Link href="/" className="flex shrink-0 items-center" aria-label="Luvevo Tutor">
        <Image src="/logo/luvevo-full.png" alt="Luvevo - Platform for All" width={500} height={200} className="h-16 w-auto object-contain sm:h-20" priority />
      </Link>

      {loading ? <div className="hidden h-10 flex-1 animate-pulse rounded-lg bg-slate-100 min-[1100px]:block" /> : <nav className="hidden flex-1 items-center justify-center gap-1 min-[1100px]:flex" aria-label="প্রধান নেভিগেশন">{items.map((item) => <NavEntry key={item.label} item={item} pathname={pathname} />)}</nav>}
      <div className="flex shrink-0 items-center gap-2">
        {!loading && user ? <>
          <Link href="/profile" className="hidden items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 min-[1100px]:flex" aria-label="আমার প্রোফাইল">
            <UserAvatar name={displayName} photoUrl={photoUrl} size={36} />
            <span className="max-w-32 truncate text-sm font-semibold text-primary">{displayName}</span>
          </Link>
          <button type="button" onClick={handleLogout} className="hidden min-h-10 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white min-[1100px]:inline">লগআউট</button>
        </> : !loading && <>
          <Link href="/register" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-primary min-[1100px]:inline">Register</Link>
          <Link href="/login" className="hidden rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white min-[1100px]:inline">Login</Link>
        </>}
        <button type="button" className="rounded-lg p-2 text-primary min-[1100px]:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'} aria-expanded={open}>{open ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div>
    {open && !loading && <div className="border-t border-slate-100 min-[1100px]:hidden">
      <nav className="flex flex-col py-2" aria-label="মোবাইল নেভিগেশন">
        {items.map((item) => <NavEntry key={item.label} item={item} pathname={pathname} mobile />)}
        <div className="flex gap-2 px-4 py-4">
          {user ? <>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <UserAvatar name={displayName} photoUrl={photoUrl} size={32} />
              <span className="truncate text-sm font-semibold text-primary">{displayName}</span>
            </Link>
            <button type="button" onClick={handleLogout} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white">লগআউট</button>
          </> : <>
            <Link href="/register" className="flex-1 rounded-lg border border-primary px-3 py-2 text-center text-sm font-semibold text-primary">Register</Link>
            <Link href="/login" className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-bold text-white">Login</Link>
          </>}
        </div>
      </nav>
    </div>}
  </header>
}