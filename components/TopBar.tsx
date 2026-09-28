"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function TopBar() {
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    router.push('/')
  }

  return (
    <div className="hidden overflow-x-hidden border-b bg-gray-50 md:block">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6 text-gray-700">
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>01843383301</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>luvevoofficial@gmail.com</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {!loading && user ? (
            <><span className="max-w-36 truncate font-medium text-primary">{profile?.full_name || user.email}</span><button onClick={handleLogout} className="text-gray-600">লগআউট</button></>
          ) : (
            <><Link href="/login" className="text-primary font-medium">লগইন</Link><Link href="/register" className="text-gray-600">রেজিস্টার</Link></>
          )}
        </div>
      </div>
    </div>
  )
}
