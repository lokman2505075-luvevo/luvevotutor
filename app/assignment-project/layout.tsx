import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'অ্যাসাইনমেন্ট ও প্রজেক্ট সহায়তা এবং সহযাত্রী | Luvevo Tutor',
  description: 'অ্যাসাইনমেন্টে সাহায্য নিন, নিজের দক্ষতা দিয়ে অন্যদের সাহায্য করুন, অথবা সহযাত্রী খুঁজে দল গড়ুন।',
}

export default function AssignmentProjectLayout({ children }: { children: ReactNode }) {
  return children
}
