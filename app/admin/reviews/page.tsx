import Link from 'next/link'
import GuardianReviewTable from '../../../components/admin/GuardianReviewTable'

export default function AdminReviewsPage() {
  return <div><div className="mb-6"><Link href="/admin" className="text-sm text-primary hover:underline">ড্যাশবোর্ড</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">Pending Guardian Reviews</h1><p className="mt-1 text-gray-600">অভিভাবকদের মতামত যাচাই করে অনুমোদন বা মুছে দিন।</p></div><GuardianReviewTable /></div>
}