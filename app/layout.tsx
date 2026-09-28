import './globals.css'
import { ReactNode } from 'react'
import { AuthProvider } from '../lib/AuthContext'

export const metadata = {
  title: 'Luvevo Tutor',
  description: 'Luvevo Tutor — আপনার সব শিক্ষা প্রয়োজনের এক ঠিকানা'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
