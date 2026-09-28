'use client'

import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { useRouter } from 'next/navigation'
import { DISTRICTS } from '@/lib/districts'
import { DISTRICT_GEOJSON_TO_SLUG } from '@/lib/districtGeoMap'

type DistrictFeature = Feature<Geometry, { ADM2_EN?: string }>
type BangladeshMapProps = { activeDistricts: readonly string[] }

export default function BangladeshMap({ activeDistricts }: BangladeshMapProps) {
  const router = useRouter()
  const [features, setFeatures] = useState<DistrictFeature[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/data/bd-districts.geojson')
      .then((response) => response.json())
      .then((data: FeatureCollection<Geometry, { ADM2_EN?: string }>) => setFeatures(data.features))
      .catch(() => setMessage('মানচিত্র লোড করা যায়নি'))
  }, [])

  const projection = useMemo(() => features.length ? geoMercator().fitSize([620, 700], { type: 'FeatureCollection', features }) : null, [features])
  const pathGenerator = useMemo(() => projection ? geoPath(projection) : null, [projection])

  function selectDistrict(slug: string, label: string) {
    if (activeDistricts.includes(slug)) router.push(`/tuition?district=${slug}`)
    else setMessage('এই জেলায় শীঘ্রই সেবা চালু হবে')
    setHovered(label)
  }

  return (
    <div className="relative rounded-xl bg-blue-50 p-3 sm:p-5" onMouseLeave={() => setHovered(null)}>
      <svg viewBox="0 0 620 700" className="h-auto w-full" role="img" aria-label="বাংলাদেশের ৬৪ জেলার সেবা মানচিত্র">
        {pathGenerator && features.map((feature) => {
          const geoName = feature.properties.ADM2_EN || ''
          const slug = DISTRICT_GEOJSON_TO_SLUG[geoName]
          const district = DISTRICTS.find((item) => item.value === slug)
          if (!district) return null
          const active = activeDistricts.includes(slug)
          return <path key={geoName} d={pathGenerator(feature) || ''} tabIndex={0} aria-label={`${district.label} জেলা${active ? ', সক্রিয়' : ', নিষ্ক্রিয়'}`} className="cursor-pointer outline-none focus:stroke-gray-900 focus:stroke-[2.5]" fill={hovered === district.label ? (active ? '#1d4ed8' : '#8fb8dc') : (active ? '#2563eb' : '#a5c8e8')} stroke="white" strokeWidth="1.2" onMouseEnter={() => setHovered(district.label)} onClick={() => selectDistrict(slug, district.label)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectDistrict(slug, district.label) } }} />
        })}
        {pathGenerator && features.map((feature) => {
          const slug = DISTRICT_GEOJSON_TO_SLUG[feature.properties.ADM2_EN || '']
          if (!activeDistricts.includes(slug)) return null
          const district = DISTRICTS.find((item) => item.value === slug)
          const centroid = pathGenerator.centroid(feature)
          return district && centroid.every(Number.isFinite) ? <text key={`${slug}-label`} x={centroid[0]} y={centroid[1]} textAnchor="middle" className="pointer-events-none hidden fill-white text-[10px] font-bold md:block">{district.label}</text> : null
        })}
      </svg>
      {hovered && <div className="absolute left-4 top-4 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow">{hovered}</div>}
      {message && <p className="rounded-md bg-yellow-100 px-3 py-2 text-center text-sm text-yellow-900">{message}</p>}
    </div>
  )
}