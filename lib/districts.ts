// lib/districts.ts
export type District = { value: string; label: string; division: string }

export const DIVISIONS = [
  'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা',
  'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ',
] as const

export const DISTRICTS: District[] = [
  // ঢাকা বিভাগ (১৩)
  { value: 'dhaka', label: 'ঢাকা', division: 'ঢাকা' },
  { value: 'faridpur', label: 'ফরিদপুর', division: 'ঢাকা' },
  { value: 'gazipur', label: 'গাজীপুর', division: 'ঢাকা' },
  { value: 'gopalganj', label: 'গোপালগঞ্জ', division: 'ঢাকা' },
  { value: 'kishoreganj', label: 'কিশোরগঞ্জ', division: 'ঢাকা' },
  { value: 'madaripur', label: 'মাদারীপুর', division: 'ঢাকা' },
  { value: 'manikganj', label: 'মানিকগঞ্জ', division: 'ঢাকা' },
  { value: 'munshiganj', label: 'মুন্সিগঞ্জ', division: 'ঢাকা' },
  { value: 'narayanganj', label: 'নারায়ণগঞ্জ', division: 'ঢাকা' },
  { value: 'narsingdi', label: 'নরসিংদী', division: 'ঢাকা' },
  { value: 'rajbari', label: 'রাজবাড়ী', division: 'ঢাকা' },
  { value: 'shariatpur', label: 'শরীয়তপুর', division: 'ঢাকা' },
  { value: 'tangail', label: 'টাঙ্গাইল', division: 'ঢাকা' },

  // চট্টগ্রাম বিভাগ (১১)
  { value: 'bandarban', label: 'বান্দরবান', division: 'চট্টগ্রাম' },
  { value: 'brahmanbaria', label: 'ব্রাহ্মণবাড়িয়া', division: 'চট্টগ্রাম' },
  { value: 'chandpur', label: 'চাঁদপুর', division: 'চট্টগ্রাম' },
  { value: 'chattogram', label: 'চট্টগ্রাম', division: 'চট্টগ্রাম' },
  { value: 'cumilla', label: 'কুমিল্লা', division: 'চট্টগ্রাম' },
  { value: 'coxsbazar', label: 'কক্সবাজার', division: 'চট্টগ্রাম' },
  { value: 'feni', label: 'ফেনী', division: 'চট্টগ্রাম' },
  { value: 'khagrachhari', label: 'খাগড়াছড়ি', division: 'চট্টগ্রাম' },
  { value: 'lakshmipur', label: 'লক্ষ্মীপুর', division: 'চট্টগ্রাম' },
  { value: 'noakhali', label: 'নোয়াখালী', division: 'চট্টগ্রাম' },
  { value: 'rangamati', label: 'রাঙ্গামাটি', division: 'চট্টগ্রাম' },

  // রাজশাহী বিভাগ (৮)
  { value: 'bogura', label: 'বগুড়া', division: 'রাজশাহী' },
  { value: 'chapainawabganj', label: 'চাঁপাইনবাবগঞ্জ', division: 'রাজশাহী' },
  { value: 'joypurhat', label: 'জয়পুরহাট', division: 'রাজশাহী' },
  { value: 'naogaon', label: 'নওগাঁ', division: 'রাজশাহী' },
  { value: 'natore', label: 'নাটোর', division: 'রাজশাহী' },
  { value: 'pabna', label: 'পাবনা', division: 'রাজশাহী' },
  { value: 'rajshahi', label: 'রাজশাহী', division: 'রাজশাহী' },
  { value: 'sirajganj', label: 'সিরাজগঞ্জ', division: 'রাজশাহী' },

  // খুলনা বিভাগ (১০)
  { value: 'bagerhat', label: 'বাগেরহাট', division: 'খুলনা' },
  { value: 'chuadanga', label: 'চুয়াডাঙ্গা', division: 'খুলনা' },
  { value: 'jashore', label: 'যশোর', division: 'খুলনা' },
  { value: 'jhenaidah', label: 'ঝিনাইদহ', division: 'খুলনা' },
  { value: 'khulna', label: 'খুলনা', division: 'খুলনা' },
  { value: 'kushtia', label: 'কুষ্টিয়া', division: 'খুলনা' },
  { value: 'magura', label: 'মাগুরা', division: 'খুলনা' },
  { value: 'meherpur', label: 'মেহেরপুর', division: 'খুলনা' },
  { value: 'narail', label: 'নড়াইল', division: 'খুলনা' },
  { value: 'satkhira', label: 'সাতক্ষীরা', division: 'খুলনা' },

  // বরিশাল বিভাগ (৬)
  { value: 'barguna', label: 'বরগুনা', division: 'বরিশাল' },
  { value: 'barishal', label: 'বরিশাল', division: 'বরিশাল' },
  { value: 'bhola', label: 'ভোলা', division: 'বরিশাল' },
  { value: 'jhalokati', label: 'ঝালকাঠি', division: 'বরিশাল' },
  { value: 'patuakhali', label: 'পটুয়াখালী', division: 'বরিশাল' },
  { value: 'pirojpur', label: 'পিরোজপুর', division: 'বরিশাল' },

  // সিলেট বিভাগ (৪)
  { value: 'habiganj', label: 'হবিগঞ্জ', division: 'সিলেট' },
  { value: 'moulvibazar', label: 'মৌলভীবাজার', division: 'সিলেট' },
  { value: 'sunamganj', label: 'সুনামগঞ্জ', division: 'সিলেট' },
  { value: 'sylhet', label: 'সিলেট', division: 'সিলেট' },

  // রংপুর বিভাগ (৮)
  { value: 'dinajpur', label: 'দিনাজপুর', division: 'রংপুর' },
  { value: 'gaibandha', label: 'গাইবান্ধা', division: 'রংপুর' },
  { value: 'kurigram', label: 'কুড়িগ্রাম', division: 'রংপুর' },
  { value: 'lalmonirhat', label: 'লালমনিরহাট', division: 'রংপুর' },
  { value: 'nilphamari', label: 'নীলফামারী', division: 'রংপুর' },
  { value: 'panchagarh', label: 'পঞ্চগড়', division: 'রংপুর' },
  { value: 'rangpur', label: 'রংপুর', division: 'রংপুর' },
  { value: 'thakurgaon', label: 'ঠাকুরগাঁও', division: 'রংপুর' },

  // ময়মনসিংহ বিভাগ (৪)
  { value: 'jamalpur', label: 'জামালপুর', division: 'ময়মনসিংহ' },
  { value: 'mymensingh', label: 'ময়মনসিংহ', division: 'ময়মনসিংহ' },
  { value: 'netrokona', label: 'নেত্রকোণা', division: 'ময়মনসিংহ' },
  { value: 'sherpur', label: 'শেরপুর', division: 'ময়মনসিংহ' },
]

// বিভাগ অনুযায়ী গ্রুপ করা (optgroup-এর জন্য)
export const DISTRICTS_BY_DIVISION = DIVISIONS.map((division) => ({
  division,
  districts: DISTRICTS.filter((d) => d.division === division),
}))

export const ACTIVE_DISTRICTS = [
  'brahmanbaria', 'chandpur', 'chattogram', 'cumilla', 'dhaka',
  'feni', 'habiganj', 'jamalpur', 'jashore', 'khulna', 'kishoreganj',
  'manikganj', 'mymensingh', 'netrokona', 'rajshahi', 'rangpur',
  'sirajganj', 'sylhet', 'tangail',
] as const