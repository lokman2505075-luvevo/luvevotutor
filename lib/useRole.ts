'use client'

import { useAuth, type Profile } from './AuthContext'

export type AudienceRole = 'guest' | 'guardian' | 'student' | 'tutor' | 'admin'

export function useRole(): { loading: boolean; role: AudienceRole; profile: Profile | null } {
  const { user, profile, loading } = useAuth()
  if (loading) return { loading: true, role: 'guest', profile: null }
  if (!user || !profile) return { loading: false, role: 'guest', profile: null }
  if (profile.role === 'tutor') return { loading: false, role: 'tutor', profile }
  if (profile.role === 'admin') return { loading: false, role: 'admin', profile }
  if (profile.role === 'student') return { loading: false, role: 'student', profile }
  return { loading: false, role: 'guardian', profile }
}