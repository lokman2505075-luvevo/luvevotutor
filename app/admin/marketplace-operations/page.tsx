import MarketplaceOperations from '../../../components/admin/MarketplaceOperations'

export default function MarketplaceOperationsPage() {
  return <div>
    <div className="mb-6">
      <p className="text-sm font-semibold text-primary">মার্কেটপ্লেস ব্যবস্থাপনা</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">অর্ডার, রিপোর্ট ও পেআউট</h1>
      <p className="mt-2 text-gray-600">পেমেন্ট যাচাই, রিপোর্ট পর্যালোচনা, কমিশন ও বিক্রেতার পেআউট পরিচালনা করুন।</p>
    </div>
    <MarketplaceOperations />
  </div>
}
