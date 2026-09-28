import ServicesGrid from '../../components/ServicesGrid'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-blue-950 sm:text-4xl">সব সার্ভিস</h1>
          <p className="mt-3 text-slate-600">আপনার প্রয়োজনীয় শিক্ষা সেবা বেছে নিন</p>
        </header>
        <ServicesGrid />
      </main>
      <Footer />
    </div>
  )
}
