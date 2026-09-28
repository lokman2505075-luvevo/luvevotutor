import Link from 'next/link'
import JobApplicationsAdminTable from '../../../components/admin/JobApplicationsAdminTable'

export default function AdminJobApplicationsPage() {
  return <div><div className="mb-6"><Link href="/admin" className="text-sm text-primary hover:underline">ড্যাশবোর্ড</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">জব আবেদন</h1><p className="mt-1 text-gray-600">টিউটর আবেদন এবং উভয় পক্ষের যোগাযোগের তথ্য পরিচালনা করুন।</p></div><JobApplicationsAdminTable /></div>
}
