import Link from 'next/link'
import JobsAdminTable from '../../../components/admin/JobsAdminTable'

export default function AdminJobPostsPage() {
  return <div><div className="mb-6"><Link href="/admin" className="text-sm text-primary hover:underline">ড্যাশবোর্ড</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">জব পোস্ট</h1><p className="mt-1 text-gray-600">জব যাচাই করুন, প্রকাশ করুন এবং অভিভাবকের যোগাযোগ পরিচালনা করুন।</p></div><JobsAdminTable /></div>
}
