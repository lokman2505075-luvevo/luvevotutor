"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: 'student' | 'tutor' | 'user' | 'admin' | null
  status?: 'pending' | 'approved' | 'rejected' | null
  subjects?: string[] | null
  district?: string | null
  institution_type?: string | null
  institution_name?: string | null
  level?: string | null
  birth_date?: string | null
  short_bio?: string | null
  photo_url?: string | null
}

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('[Supabase] profile lookup failed:', error.message)
    return null
  }
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession(session: Session | null) {
      const nextUser = session?.user ?? null
      if (!mounted) return
      setUser(nextUser)
      setProfile(nextUser ? await getProfile(nextUser.id) : null)
      if (mounted) setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadSession(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  // profile table theke abar data niye navbar shoho shob jaygay update kore
  async function refreshProfile() {
    if (!user) return
    setProfile(await getProfile(user.id))
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}