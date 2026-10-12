'use client'

import { useParams } from 'next/navigation'
import Footer from '../../../../components/Footer'
import Navbar from '../../../../components/Navbar'
import SohojatriDetails from '../../../../components/sohojatri/SohojatriDetails'

export default function SohojatriDetailsPage() {
  const params = useParams<{ id: string }>()
  return <div className="min-h-screen bg-slate-50 text-gray-900">
    <Navbar />
    <SohojatriDetails postId={params.id} />
    <Footer />
  </div>
}
