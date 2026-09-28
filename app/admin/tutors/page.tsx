'use client'

import TutorApprovalTable from '../../../components/admin/TutorApprovalTable'

export default function AdminTutorsPage() {
  return <div><div className="mb-6"><p className="text-sm font-semibold text-primary">টিউটর ব্যবস্থাপনা</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">টিউটর অনুমোদন</h1><p className="mt-2 text-gray-600">নতুন টিউটরদের তথ্য যাচাই করে অনুমোদন দিন।</p></div><TutorApprovalTable /></div>
}