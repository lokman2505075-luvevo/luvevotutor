'use client'
import { useEffect, useRef, useState } from 'react'

export default function ComboInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => setQuery(value), [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  )

  function selectOption(opt: string) {
    setQuery(opt)
    onChange(opt)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded border p-2"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border bg-white shadow-lg">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => selectOption(opt)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-sky-50"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}