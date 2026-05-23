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
  categories: DEFAULT_CATEGORIES
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
  if (/starbucks|mcdonald|burger|restaurant|dining|smoothie|sonic|dairy.queen|pizza|subway|dunkin|taco|chipotle|deli|cafe|coffee|donut|panera|chick.fil|popeyes|wendy|arby|kfc/.test(d)) return 'Food & Dining'
  if (/target|walmart|amazon|costco|sam.s club|dollar|tj.maxx|marshalls|macy|kohl|best.buy|home.depot|lowes|walgreen|cvs|rite.aid/.test(d)) return 'Shopping'
  if (/shell|bp|exxon|chevron|mobil|speedway|kwik.trip|gas|fuel|auto|midas|jiffy|car.wash/.test(d)) return 'Transportation'
  if (/netflix|spotify|hulu|disney|hbo|apple.com\/bill|google.play|steam|xbox|playstation|ticketmaster|amc/.test(d)) return 'Entertainment'
  if (/deposit|payroll|direct dep|salary|paycheck|dte deposit/.test(d)) return 'Income'
  if (/transfer|savings|zelle|venmo|paypal/.test(d)) return 'Savings'
  if (/electric|consumers|dte|xcel|at&t|verizon|comcast|spectrum|t-mobile|internet|phone bill|water bill|gas bill/.test(d)) return 'Utilities'
  if (/doctor|hospital|clinic|pharmacy|dental|vision|health|urgent care|medical/.test(d)) return 'Healthcare'
  if (/rent|mortgage|hoa|apartment/.test(d)) return 'Housing'
  return 'Other'
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? []
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? '').replace(/^"|"$/g, '').trim()])
    )
  })
}
