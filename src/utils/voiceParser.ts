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

const WORD_TO_NUM: Record<string, number> = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100
}

export function replaceWordsWithDigits(text: string): string {
  let normalized = normalizeText(text)

  // 1. Pre-procesar "un/una/uno" únicamente en contextos numéricos para evitar colisiones con el artículo indefinido
  normalized = normalized.replace(/\b(?:un|una|uno)\s*(?=euros?|€|eur\b)/g, '1 ')
  normalized = normalized.replace(/\b(?:un|una|uno)\s+(?=con\b|coma\b)/g, '1 ')

  // 2. Decenas y unidades: "treinta y cinco" -> 35
  const decenasYUnidades = /\b(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g
  normalized = normalized.replace(decenasYUnidades, (match, dec, uni) => {
    const d = WORD_TO_NUM[dec] || 0
    const u = uni === 'un' || uni === 'uno' || uni === 'una' ? 1 : (WORD_TO_NUM[uni] || 0)
    return String(d + u)
  })

  // 3. Reemplazar palabras numéricas individuales que queden por su número correspondiente
  // Debemos procesar de más largo a más corto para evitar colisiones (ej: "dieciseis" antes de "seis")
  const sortedWords = Object.keys(WORD_TO_NUM).sort((a, b) => b.length - a.length)
  for (const word of sortedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g')
    normalized = normalized.replace(regex, String(WORD_TO_NUM[word]))
  }

  return normalized
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
  const digitsText = replaceWordsWithDigits(text)

  // 1. Buscar expresiones de decimales en lenguaje natural: "X con Y", "X coma Y", "X euros con Y"
  // Ejemplos: "43 con 50", "43 euros con 50", "2 coma 5"
  const naturalDecimalRegex = /\b(\d+)\s*(?:euros?|€|eur)?\s*(?:con|coma)\s*(\d+)\s*(?:centimos|cents?|euros?|€|eur)?\b/i
  const natMatch = naturalDecimalRegex.exec(digitsText)
  if (natMatch) {
    const integerPart = parseInt(natMatch[1], 10)
    let decimalStr = natMatch[2]

    // Si la parte decimal tiene un solo dígito (ej. "2 con 5"), lo normalizamos como centésimas ("05")
    if (decimalStr.length === 1) {
      decimalStr = '0' + decimalStr
    }

    const val = parseFloat(`${integerPart}.${decimalStr}`)
    if (!isNaN(val) && val > 0) return val
  }

  // 2. Check for standard decimal number followed by currency (e.g. "43.50€", "43,50 euros", "2,50 eur")
  const currencyRegex = /(\d+(?:[\.,]\d+)?)\s*(?:euros?|€|eur\b)/g
  let match = currencyRegex.exec(digitsText)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 3. Check for number preceded by "de" or "gasto de" or "ingreso de" etc.
  const prepositionRegex = /(?:\bde|\btotal de|\bimporte de|\bpor valor de|\bpor)\s+(\d+(?:[\.,]\d+)?)\b/g
  match = prepositionRegex.exec(digitsText)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 4. Just find any positive number that is NOT a day in "el día X" or "el X de Y"
  const anyNumberRegex = /\b(\d+(?:[\.,]\d+)?)\b/g
  let matchNum: RegExpExecArray | null
  while ((matchNum = anyNumberRegex.exec(digitsText)) !== null) {
    const val = parseFloat(matchNum[1].replace(',', '.'))
    const index = matchNum.index
    const prefix = digitsText.substring(Math.max(0, index - 10), index)
    const suffix = digitsText.substring(index + matchNum[1].length, Math.min(digitsText.length, index + matchNum[1].length + 15))

    const isDay = /\b(?:el|dia)\s*$/i.test(prefix) || /^\s*de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/i.test(suffix)
    if (!isDay && !isNaN(val) && val > 0) {
      return val
    }
  }

  // 5. Fallback: single number in digitsText
  const allNumbers = digitsText.match(/\b\d+(?:[\.,]\d+)?\b/g)
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

export function extractNote(text: string): string {
  const normalized = normalizeText(text)

  const noteTriggers = [
    /\b(?:con|en)?\s*notas?\s*(?:de|que|:|\b)\s*(.+)$/i,
    /\b(?:pon|poner|escribe|escribir|añade|añadir)\s+(?:en\s+)?(?:la\s+)?notas?\s*(?:de|que|:|\b)\s*(.+)$/i,
    /\b(?:con\s+el\s+concepto|concepto\s+de)\s*(?::|\b)\s*(.+)$/i
  ]

  for (const trigger of noteTriggers) {
    const match = trigger.exec(normalized)
    if (match) {
      const noteContent = match[1]
      const startIndex = normalized.indexOf(noteContent)
      if (startIndex !== -1) {
        return text.substring(startIndex).trim()
      }
    }
  }

  return ''
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
  const note = extractNote(text)

  return {
    kind,
    amount,
    categoryId,
    familyMemberId,
    occurredOn,
    note,
  }
}
