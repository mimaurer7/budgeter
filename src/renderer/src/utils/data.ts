import { AppData, Category } from '../types'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Housing', color: '#6366f1' },
  { id: '2', name: 'Food & Dining', color: '#f59e0b' },
  { id: '3', name: 'Transportation', color: '#10b981' },
  { id: '4', name: 'Utilities', color: '#3b82f6' },
  { id: '5', name: 'Healthcare', color: '#ef4444' },
  { id: '6', name: 'Entertainment', color: '#8b5cf6' },
  { id: '7', name: 'Shopping', color: '#ec4899' },
  { id: '8', name: 'Savings', color: '#14b8a6' },
  { id: '9', name: 'Income', color: '#22c55e' },
  { id: '10', name: 'Other', color: '#94a3b8' }
]

export const EMPTY_APP_DATA: AppData = {
  transactions: [],
  budgetGoals: [],
  categories: DEFAULT_CATEGORIES,
  monthlyIncome: {}
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Converts MM/DD/YYYY, M/D/YYYY, or already-correct YYYY-MM-DD → YYYY-MM-DD
export function normalizeDate(raw: string): string {
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, m, d, y] = slash
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return raw
}

export function formatDate(dateStr: string): string {
  const normalized = normalizeDate(dateStr)
  const d = new Date(normalized + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function monthKey(dateStr: string): string {
  return normalizeDate(dateStr).slice(0, 7)
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function guessCategory(description: string): string {
  const d = description.toLowerCase()
  // Income — check before utilities so "dte ... payroll" hits here
  if (/payroll|direct dep|active payroll|salary|paycheck/.test(d)) return 'Income'
  if (/^external deposit|^deposit/.test(d) && !/transfer/.test(d)) return 'Income'
  // Savings / transfers
  if (/transfer|savings|zelle|venmo|paypal|cash.?app/.test(d)) return 'Savings'
  // Food & Dining
  if (/starbucks|mcdonald|mcdonalds|burger|smoothie|sonic|dairy.?queen|pizza|subway|dunkin|taco|chipotle|deli|cafe|coffee|donut|panera|chick.?fil|popeyes|wendy|arby|kfc|buffalo.?wild|grubhub|doordash|ubereats|domino|little.?caesar|olive.?garden|applebee|ihop|denny|culver|qdoba|five.?guys|jimmy.?john|firehouse|potbelly|canes|raising/.test(d)) return 'Food & Dining'
  // Transportation / Gas
  if (/shell.?oil|shell\s|speedway|marathon|sunoco|circle.?k|kwik|bp\s|exxon|chevron|mobil|meijer.?gas|fuel|jiffy.?lube|midas|car.?wash|auto.?zone|o'reilly|napa.?auto|parking|uber\s|lyft/.test(d)) return 'Transportation'
  // Entertainment
  if (/spotify|netflix|hulu|disney|hbo|apple.*bill|google.?play|steam|xbox|playstation|ticketmaster|amc\s|microsoft.*store|youtube.*premium|amazon.*prime|paramount|peacock/.test(d)) return 'Entertainment'
  // Utilities
  if (/\bdte\b|consumers.?energy|xcel|at&t|verizon|comcast|spectrum|t-mobile|tmobile|internet|electric|water.?bill/.test(d)) return 'Utilities'
  // Healthcare
  if (/hospital|clinic|pharmacy|dental|vision|urgent.?care|medical|walgreen|cvs|rite.?aid|health/.test(d)) return 'Healthcare'
  // Shopping
  if (/target|walmart|amazon|costco|sam.?s.?club|dollar.?general|dollar.?tree|family.?dollar|tj.?maxx|marshalls|macy|kohl|best.?buy|home.?depot|lowes|kroger|meijer|aldi|trader.?joe|whole.?foods|ikea|chewy|wayfair/.test(d)) return 'Shopping'
  // Housing
  if (/rent|mortgage|hoa|apartment/.test(d)) return 'Housing'
  return 'Other'
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break }
    if (line[i] === '"') {
      let field = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      fields.push(field.trim())
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { fields.push(line.slice(i).trim()); break }
      fields.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return fields
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0])
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = parseCsvLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })
}
