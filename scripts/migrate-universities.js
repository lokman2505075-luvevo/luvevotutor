/* eslint-disable no-console */
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const sourcePath = path.join(__dirname, '..', 'app', 'admission-consultancy', 'page.tsx')
const source = fs.readFileSync(sourcePath, 'utf8')

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return {}
  return Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf('=')
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')]
  }))
}

function unquote(value) {
  if (value === 'null') return null
  const quote = value[0]
  return value.slice(1, -1).replace(new RegExp(`\\\\${quote}`, 'g'), quote).replace(/\\n/g, '\n')
}

function blockFor(name) {
  const start = source.indexOf(`const ${name} = [`)
  const end = source.indexOf('\n  ]', start)
  if (start === -1 || end === -1) throw new Error(`Could not find ${name} in ${sourcePath}`)
  return source.slice(start + `const ${name} = [`.length, end)
}

function readNames(name) {
  return blockFor(name).split(/\r?\n/).map((line) => line.trim().match(/^(['"])(.*)\1,?$/)).filter(Boolean).map((match) => match[2])
}

function readPairs(name) {
  return blockFor(name).split(/\r?\n/).map((line) => line.trim().match(/^\[(['"])(.*)\1,\s*(['"])(.*)\3\],?$/)).filter(Boolean).map((match) => [match[2], match[4]])
}

function readLiteralAdmissions() {
  const admissionsStart = source.indexOf('const admissions: Admission[] = [')
  const body = source.slice(admissionsStart, source.indexOf('  ]', admissionsStart))
  const readField = (line, field) => {
    const match = line.match(new RegExp(`${field}: (null|'[^']*'|"(?:\\\\.|[^"])*")`))
    return match ? unquote(match[1]) : null
  }
  return body.split(/\r?\n/).filter((line) => line.includes('{ university:')).map((line) => ({
    university: readField(line, 'university'),
    cluster: readField(line, 'cluster'),
    circular: readField(line, 'circular'),
    start: readField(line, 'start'),
    deadline: readField(line, 'deadline'),
    exam: readField(line, 'exam'),
    examCenter: readField(line, 'examCenter'),
    result: readField(line, 'result'),
    status: readField(line, 'status'),
  }))
}

function makeAdmission(university, category, values = {}, collegeCode = null) {
  return {
    name_bn: university,
    name_en: university,
    category,
    college_code: collegeCode,
    circular_date: values.circular ?? null,
    application_start: values.start ?? null,
    application_end: values.deadline ?? null,
    exam_date: values.exam ?? null,
    exam_center: values.examCenter ?? null,
    result: values.result ?? null,
    status: values.status ?? null,
  }
}

function buildRows() {
  const rows = []
  const add = (university, category, values, collegeCode = null) => rows.push(makeAdmission(university, category, values, collegeCode))
  const empty = { circular: null, start: null, deadline: null, exam: null, examCenter: null, result: null, status: 'সার্কুলারের অপেক্ষায়' }

  const literalAdmissions = readLiteralAdmissions()
  literalAdmissions.slice(0, 6).forEach((item) => add(item.university, 'engineering', item))

  readNames('gstUniversities').forEach((university) => add(university, 'gst_cluster', { ...empty, examCenter: 'প্রার্থীর পছন্দ অনুযায়ী নির্ধারিত হবে', status: 'সার্কুলারের অপেক্ষায় (২০২৬-২৭ সেশন)' }))
  readNames('agricultureUniversities').forEach((university) => add(university, 'agriculture_cluster', { ...empty, exam: '৩ জানুয়ারি ২০২৬', examCenter: '৯টি মূল কেন্দ্র (এই ৯ ভার্সিটি) + একাধিক সাব-সেন্টার (DU, JnU সহ)' }))
  readPairs('medicalColleges').forEach(([collegeCode, university]) => add(university, 'medical', { ...empty, examCenter: 'প্রার্থীর নির্ধারিত কেন্দ্র অনুযায়ী (দেশব্যাপী একযোগে অনুষ্ঠিত হয়)' }, collegeCode))
  readPairs('dentalColleges').forEach(([collegeCode, university]) => add(university, 'bds', { ...empty, examCenter: 'প্রার্থীর নির্ধারিত কেন্দ্র অনুযায়ী (দেশব্যাপী একযোগে অনুষ্ঠিত হয়)' }, collegeCode))

  literalAdmissions.slice(6).forEach((item) => {
    const category = item.cluster === 'জাতীয় বিশ্ববিদ্যালয়' ? 'national_university'
      : item.cluster === 'প্রাইভেট ভার্সিটি' ? 'private'
        : item.cluster === 'অন্যান্য পাবলিক' ? 'other_public'
          : item.cluster === 'BUTEX অধিভুক্ত' || item.cluster === 'DU প্রযুক্তি ইউনিট অধিভুক্ত' ? 'national_university'
            : item.cluster
    add(item.university, category, item, item.collegeCode ?? null)
  })

  return rows.map((row, index, allRows) => ({ ...row, display_order: allRows.slice(0, index).filter((previous) => previous.category === row.category).length }))
}

async function main() {
  const env = { ...readEnvFile(), ...process.env }
  const rows = buildRows()
  const expectedCount = 114
  if (rows.length !== expectedCount) throw new Error(`Expected ${expectedCount} rows, parsed ${rows.length}`)

  console.log(`Prepared ${rows.length} university rows.`)
  console.table(rows.reduce((summary, row) => {
    summary[row.category] = (summary[row.category] || 0) + 1
    return summary
  }, {}))
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(rows.slice(0, 3), null, 2))
    return
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running the migration.')
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: deleteError } = await supabase.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase.from('universities').insert(rows)
  if (insertError) throw insertError
  console.log(`Migrated ${rows.length} entries to public.universities.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
