import type { Category, FamilyMember } from '@/types'

export interface ParsedVoiceTransaction {
  kind: 'expense' | 'income'
  amount: number | null
  categoryId: string
  familyMemberId: string
  occurredOn: string
  note: string
}

export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function extractKind(text: string): 'expense' | 'income' {
  const normalized = normalizeText(text)

  const incomeWords = ['ingreso', 'ingresar', 'ganar', 'recibir', 'cobrar', 'sueldo', 'nomina', 'renta', 'deposito']
  const expenseWords = ['gasto', 'gastar', 'comprar', 'pagar', 'factura', 'compra', 'salida']

  // Check if any income word matches
  for (const word of incomeWords) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return 'income'
    }
  }

  // If "ingreso" is not explicit, check if there is an expense word
  for (const word of expenseWords) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return 'expense'
    }
  }

  return 'expense' // default
}

export function extractAmount(text: string): number | null {
  const normalized = normalizeText(text)

  // 1. Check for number followed by currency (e.g. "43 euros", "43.5€", "43,5 eur")
  const currencyRegex = /(\d+(?:[\.,]\d+)?)\s*(?:euros?|€|eur\b)/g
  let match = currencyRegex.exec(normalized)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 2. Check for number preceded by "de" or "gasto de" or "ingreso de" or "total de" or "importe de"
  const prepositionRegex = /(?:\bde|\btotal de|\bimporte de|\bpor valor de|\bpor)\s+(\d+(?:[\.,]\d+)?)\b/g
  match = prepositionRegex.exec(normalized)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 3. Just find any positive number that is NOT a day in "el día X" or "el X de Y"
  const anyNumberRegex = /\b(\d+(?:[\.,]\d+)?)\b/g
  let matchNum: RegExpExecArray | null
  while ((matchNum = anyNumberRegex.exec(normalized)) !== null) {
    const val = parseFloat(matchNum[1].replace(',', '.'))
    const index = matchNum.index
    const prefix = normalized.substring(Math.max(0, index - 10), index)
    const suffix = normalized.substring(index + matchNum[1].length, Math.min(normalized.length, index + matchNum[1].length + 15))

    const isDay = /\b(?:el|dia)\s*$/i.test(prefix) || /^\s*de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/i.test(suffix)
    if (!isDay && !isNaN(val) && val > 0) {
      return val
    }
  }

  // 4. Fallback: if there's only one number in the whole text, use it!
  const allNumbers = normalized.match(/\b\d+(?:[\.,]\d+)?\b/g)
  if (allNumbers && allNumbers.length === 1) {
    const val = parseFloat(allNumbers[0].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  return null
}

export function extractDate(text: string): string {
  const normalized = normalizeText(text)

  const getRelativeDate = (offset: number): string => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 1. Relative dates
  if (/\bhoy\b/.test(normalized)) {
    return getRelativeDate(0)
  }
  if (/\bayer\b/.test(normalized)) {
    return getRelativeDate(-1)
  }
  if (/\bmanana\b/.test(normalized)) {
    return getRelativeDate(1)
  }

  // 2. Specific date with month name: "el 15 de octubre", "el dia 2 de febrero"
  const MONTH_MAP: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
    noviembre: 11, diciembre: 12
  }

  const dateWithMonthRegex = /\bel\s+(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/
  const monthMatch = dateWithMonthRegex.exec(normalized)
  if (monthMatch) {
    const dayNum = parseInt(monthMatch[1], 10)
    const monthName = monthMatch[2]
    const monthNum = MONTH_MAP[monthName]
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      const year = new Date().getFullYear()
      const mStr = String(monthNum).padStart(2, '0')
      const dStr = String(dayNum).padStart(2, '0')
      return `${year}-${mStr}-${dStr}`
    }
  }

  // 3. Simple day of current month: "el dia 15", "el 15"
  const simpleDayRegex = /\bel\s+(?:dia\s+)?(\d{1,2})\b/
  const dayMatch = simpleDayRegex.exec(normalized)
  if (dayMatch) {
    const dayNum = parseInt(dayMatch[1], 10)
    if (dayNum >= 1 && dayNum <= 31) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const dStr = String(dayNum).padStart(2, '0')
      return `${year}-${month}-${dStr}`
    }
  }

  // 4. Default: today
  return getRelativeDate(0)
}

export function extractCategory(
  text: string,
  categories: Category[],
  kind: 'expense' | 'income'
): string {
  if (!categories || categories.length === 0) return ''

  const normalized = normalizeText(text)
  const filteredCategories = categories.filter((c) => c.kind === kind)

  const findMatch = (list: Category[]): string => {
    const sorted = [...list].sort((a, b) => b.name.length - a.name.length)
    for (const cat of sorted) {
      const normalizedCatName = normalizeText(cat.name)
      if (normalizedCatName && normalized.includes(normalizedCatName)) {
        return cat.id
      }
    }
    return ''
  }

  // 1. Try matching within correct kind
  let matchedId = findMatch(filteredCategories)
  if (matchedId) return matchedId

  // 2. Try matching any category as fallback
  matchedId = findMatch(categories)
  if (matchedId) return matchedId

  // 3. Fallback: first category of correct kind
  const firstOfKind = filteredCategories[0] || categories[0]
  return firstOfKind ? firstOfKind.id : ''
}

export function extractFamilyMember(
  text: string,
  members: FamilyMember[],
  defaultMemberId?: string
): string {
  if (!members || members.length === 0) return defaultMemberId || ''

  const normalized = normalizeText(text)
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length)
  for (const member of sorted) {
    const normalizedName = normalizeText(member.name)
    if (normalizedName && normalized.includes(normalizedName)) {
      return member.id
    }
  }

  return defaultMemberId || members[0]?.id || ''
}

export function parseVoiceCommand(
  text: string,
  categories: Category[],
  members: FamilyMember[],
  defaultMemberId?: string
): ParsedVoiceTransaction {
  const kind = extractKind(text)
  const amount = extractAmount(text)
  const occurredOn = extractDate(text)
  const categoryId = extractCategory(text, categories, kind)
  const familyMemberId = extractFamilyMember(text, members, defaultMemberId)

  return {
    kind,
    amount,
    categoryId,
    familyMemberId,
    occurredOn,
    note: text.trim(),
  }
}
