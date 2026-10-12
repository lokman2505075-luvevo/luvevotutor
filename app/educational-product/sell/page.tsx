import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import SellerListingForm from '../../../components/marketplace/SellerListingForm'

export default function SellEducationalProductPage() {
  return <div className="min-h-screen bg-slate-50 text-gray-900"><Navbar /><main className="container mx-auto px-4 py-8"><SellerListingForm /></main><Footer /></div>
}
