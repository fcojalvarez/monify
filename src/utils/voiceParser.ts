import type { Category, FamilyMember } from '@/types'

export interface ParsedVoiceTransaction {
  kind: 'expense' | 'income'
  amount: number | null
  categoryId: string
  familyMemberId: string
  occurredOn: string
  note: string
  isCash: boolean
  isRecurring: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  months: number[]
  dayOfMonth: number
  unrecognizedFields: ('amount' | 'category' | 'familyMember')[]
}

export interface ParsedRecurringInfo {
  isRecurring: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  months: number[]
  dayOfMonth: number
}

export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const WORD_TO_NUM: Record<string, number> = {
  // Spanish
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintdos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100,

  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100
}

export function replaceWordsWithDigits(text: string): string {
  let normalized = normalizeText(text)

  // Pre-process English hyphenated numbers (e.g., twenty-five -> twenty five)
  normalized = normalized.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)\b/g, '$1 $2')

  // 1. Pre-procesar "un/una/uno" / "one" únicamente en contextos numéricos para evitar colisiones con el artículo indefinido
  normalized = normalized.replace(/\b(?:un|una|uno|one)\s*(?=euros?|€|eur\b|dollars?|\$|usd\b)/g, '1 ')
  normalized = normalized.replace(/\b(?:un|una|uno|one)\s+(?=con\b|coma\b|point\b|and\b)/g, '1 ')

  // 2. Decenas y unidades en Español: "treinta y cinco" -> 35
  const decenasYUnidadesEs = /\b(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g
  normalized = normalized.replace(decenasYUnidadesEs, (match, dec, uni) => {
    const d = WORD_TO_NUM[dec] || 0
    const u = uni === 'un' || uni === 'uno' || uni === 'una' ? 1 : (WORD_TO_NUM[uni] || 0)
    return String(d + u)
  })

  // 2b. Decenas y unidades en Inglés: "twenty five" -> 25
  const decenasYUnidadesEn = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/g
  normalized = normalized.replace(decenasYUnidadesEn, (match, dec, uni) => {
    const d = WORD_TO_NUM[dec] || 0
    const u = WORD_TO_NUM[uni] || 0
    return String(d + u)
  })

  // 3. Reemplazar palabras numéricas individuales que queden por su número correspondiente
  // Debemos procesar de más largo a más corto para evitar colisiones
  const sortedWords = Object.keys(WORD_TO_NUM).sort((a, b) => b.length - a.length)
  for (const word of sortedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g')
    normalized = normalized.replace(regex, String(WORD_TO_NUM[word]))
  }

  return normalized
}

export function extractKind(text: string): 'expense' | 'income' {
  const normalized = normalizeText(text)

  const incomeWords = [
    'ingreso', 'ingresar', 'ganar', 'recibir', 'cobrar', 'sueldo', 'nomina', 'renta', 'deposito',
    'income', 'salary', 'deposit', 'earn', 'receive'
  ]
  const expenseWords = [
    'gasto', 'gastar', 'comprar', 'pagar', 'factura', 'compra', 'salida',
    'expense', 'spend', 'pay', 'bill', 'purchase', 'outflow'
  ]

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

export function extractIsCash(text: string): boolean {
  const normalized = normalizeText(text)
  return (
    /\b(?:en\s+)?efectivo\b/.test(normalized) ||
    /\b(?:en\s+)?cartera\b/.test(normalized) ||
    /\b(?:con\s+)?cash\b/.test(normalized) ||
    /\bin\s+cash\b/.test(normalized)
  )
}

export function extractAmount(text: string): number | null {
  const digitsText = replaceWordsWithDigits(text)

  // 1. Buscar expresiones de decimales en lenguaje natural: "X con Y", "X coma Y", "X point Y", "X and Y", "X euros con Y"
  // Ejemplos: "43 con 50", "43 euros con 50", "2 coma 5", "two point five", "3 dollars and 50 cents"
  const naturalDecimalRegex = /\b(\d+)\s*(?:euros?|€|eur|dollars?|\$|usd)?\s*(con|coma|point|and)\s*(\d+)\s*(?:centimos|cents?|euros?|€|eur|dollars?|\$|usd)?\b/i
  const natMatch = naturalDecimalRegex.exec(digitsText)
  if (natMatch) {
    const integerPart = parseInt(natMatch[1], 10)
    const connector = natMatch[2].toLowerCase()
    let decimalStr = natMatch[3]

    // Si la parte decimal tiene un solo dígito (ej. "2 con 5"), lo normalizamos como centésimas ("05")
    // Pero solo si el conector indica una estructura de monedas (con, and), no punto decimal (point, coma)
    if (decimalStr.length === 1 && (connector === 'con' || connector === 'and')) {
      decimalStr = '0' + decimalStr
    }

    const val = parseFloat(`${integerPart}.${decimalStr}`)
    if (!isNaN(val) && val > 0) return val
  }

  // 2a. Check for prefix currency (e.g., "$43.50", "usd 25")
  const prefixCurrencyRegex = /(?:\$|usd)\s*(\d+(?:[\.,]\d+)?)\b/g
  let match = prefixCurrencyRegex.exec(digitsText)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 2b. Check for standard decimal number followed by currency (e.g. "43.50€", "43,50 euros", "2,50 eur", "2.50 dollars")
  const currencyRegex = /(\d+(?:[\.,]\d+)?)\s*(?:euros?|€|eur|dollars?|\$|usd\b)/g
  match = currencyRegex.exec(digitsText)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 3. Check for number preceded by "de", "of", "total of", "amount of", "value of" etc.
  const prepositionRegex = /(?:\bde|\btotal de|\bimporte de|\bpor valor de|\bpor|\bof|\btotal of|\bamount of|\bvalue of|\bfor)\s+(\d+(?:[\.,]\d+)?)\b/g
  match = prepositionRegex.exec(digitsText)
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'))
    if (!isNaN(val) && val > 0) return val
  }

  // 4. Just find any positive number that is NOT a day in "el día X" or "el X de Y" or "the Xth" or "on day X"
  const anyNumberRegex = /\b(\d+(?:[\.,]\d+)?)\b/g
  let matchNum: RegExpExecArray | null
  while ((matchNum = anyNumberRegex.exec(digitsText)) !== null) {
    const val = parseFloat(matchNum[1].replace(',', '.'))
    const index = matchNum.index
    const prefix = digitsText.substring(Math.max(0, index - 10), index)
    const suffix = digitsText.substring(index + matchNum[1].length, Math.min(digitsText.length, index + matchNum[1].length + 15))

    const isDay = (
      /\b(?:el|dia|the|day)\s*$/i.test(prefix) ||
      /^\s*(?:st|nd|rd|th)?\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/i.test(suffix) ||
      /^\s*(?:st|nd|rd|th)?\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i.test(suffix)
    )
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
  if (/\bhoy\b/.test(normalized) || /\btoday\b/.test(normalized)) {
    return getRelativeDate(0)
  }
  if (/\bayer\b/.test(normalized) || /\byesterday\b/.test(normalized)) {
    return getRelativeDate(-1)
  }
  if (/\bmanana\b/.test(normalized) || /\btomorrow\b/.test(normalized)) {
    return getRelativeDate(1)
  }

  // 2. Specific date with month name
  const MONTH_MAP: Record<string, number> = {
    // Spanish
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
    noviembre: 11, diciembre: 12,
    // English
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  }

  // Spanish: "el 15 de octubre", "el dia 2 de febrero"
  const dateWithMonthRegex = /\bel\s+(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/
  const monthMatch = dateWithMonthRegex.exec(normalized)
  if (monthMatch) {
    const dayNum = parseInt(monthMatch[1], 10)
    const monthName = monthMatch[2]
    const monthNum = MONTH_MAP[monthName]
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      // Evitar emparejar si es parte de una regla de recurrencia
      const prefix = normalized.substring(0, monthMatch.index)
      const isRecurrence = /\b(?:every|each|days|dias|todos|los)\b/i.test(prefix)
      if (!isRecurrence) {
        const year = new Date().getFullYear()
        const mStr = String(monthNum).padStart(2, '0')
        const dStr = String(dayNum).padStart(2, '0')
        return `${year}-${mStr}-${dStr}`
      }
    }
  }

  // English: "on [the] 15[th/st/rd/nd] of october"
  const englishDateOfRegex = /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  const engOfMatch = englishDateOfRegex.exec(normalized)
  if (engOfMatch) {
    const dayNum = parseInt(engOfMatch[1], 10)
    const monthName = engOfMatch[2]
    const monthNum = MONTH_MAP[monthName]
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      // Evitar emparejar si es parte de una regla de recurrencia
      const prefix = normalized.substring(0, engOfMatch.index)
      const isRecurrence = /\b(?:every|each|days|dias|todos|los)\b/i.test(prefix)
      if (!isRecurrence) {
        const year = new Date().getFullYear()
        const mStr = String(monthNum).padStart(2, '0')
        const dStr = String(dayNum).padStart(2, '0')
        return `${year}-${mStr}-${dStr}`
      }
    }
  }

  // English: "october 15[th]"
  const englishMonthDayRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i
  const engMonthDayMatch = englishMonthDayRegex.exec(normalized)
  if (engMonthDayMatch) {
    const monthName = engMonthDayMatch[1]
    const dayNum = parseInt(engMonthDayMatch[2], 10)
    const monthNum = MONTH_MAP[monthName]
    if (dayNum >= 1 && dayNum <= 31 && monthNum) {
      // Evitar emparejar si es parte de una regla de recurrencia
      const prefix = normalized.substring(0, engMonthDayMatch.index)
      const isRecurrence = /\b(?:every|each|days|dias|todos|los)\b/i.test(prefix)
      if (!isRecurrence) {
        const year = new Date().getFullYear()
        const mStr = String(monthNum).padStart(2, '0')
        const dStr = String(dayNum).padStart(2, '0')
        return `${year}-${mStr}-${dStr}`
      }
    }
  }

  // 3. Simple day of current month: "el dia 15", "el 15", "on the 15th", "on day 15"
  const simpleDayRegex = /\b(?:el\s+(?:dia\s+)?|on\s+the\s+|on\s+day\s+)(\d{1,2})(?:st|nd|rd|th)?\b/
  const dayMatch = simpleDayRegex.exec(normalized)
  if (dayMatch) {
    const dayNum = parseInt(dayMatch[1], 10)
    if (dayNum >= 1 && dayNum <= 31) {
      // Evitar emparejar si es parte de una regla de recurrencia
      const prefix = normalized.substring(0, dayMatch.index)
      const isRecurrence = /\b(?:every|each|days|dias|todos|los)\b/i.test(prefix)
      if (!isRecurrence) {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const dStr = String(dayNum).padStart(2, '0')
        return `${year}-${month}-${dStr}`
      }
    }
  }

  // 4. Default: today
  return getRelativeDate(0)
}

export function extractCategory(
  text: string,
  categories: Category[],
  kind: 'expense' | 'income'
): { categoryId: string; exactMatch: boolean } {
  if (!categories || categories.length === 0) return { categoryId: '', exactMatch: false }

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
  if (matchedId) return { categoryId: matchedId, exactMatch: true }

  // 2. Try matching any category as fallback
  matchedId = findMatch(categories)
  if (matchedId) return { categoryId: matchedId, exactMatch: true }

  // 3. Fallback: first category of correct kind
  const firstOfKind = filteredCategories[0] || categories[0]
  return { categoryId: firstOfKind ? firstOfKind.id : '', exactMatch: false }
}

export function extractFamilyMember(
  text: string,
  members: FamilyMember[],
  defaultMemberId?: string
): { familyMemberId: string; exactMatch: boolean } {
  if (!members || members.length === 0) return { familyMemberId: defaultMemberId || '', exactMatch: false }

  const normalized = normalizeText(text)
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length)
  for (const member of sorted) {
    const normalizedName = normalizeText(member.name)
    if (normalizedName && normalized.includes(normalizedName)) {
      return { familyMemberId: member.id, exactMatch: true }
    }
  }

  const fallbackId = defaultMemberId || members[0]?.id || ''
  return { familyMemberId: fallbackId, exactMatch: false }
}

export function extractNote(text: string): string {
  const normalized = normalizeText(text)

  const noteTriggers = [
    // Spanish triggers
    /\b(?:con|en)?\s*notas?\s*(?:de|que|:|\b)\s*(.+)$/i,
    /\b(?:pon|poner|escribe|escribir|añade|añadir)\s+(?:en\s+)?(?:la\s+)?notas?\s*(?:de|que|:|\b)\s*(.+)$/i,
    /\b(?:con\s+el\s+concepto|concepto\s+de)\s*(?::|\b)\s*(.+)$/i,
    // English triggers
    /\b(?:with|in)?\s*notes?\s*(?:of|that|:|\b)\s*(.+)$/i,
    /\b(?:put|write|add)\s+(?:in\s+)?(?:the\s+)?notes?\s*(?:of|that|:|\b)\s*(.+)$/i,
    /\b(?:with\s+the\s+concept|concept\s+of)\s*(?::|\b)\s*(.+)$/i
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

export function extractRecurring(text: string): ParsedRecurringInfo {
  const normalized = normalizeText(text)

  // 1. Primero comprobar recurrencias personalizadas mensuales con día específico:
  // "los 1 de cada mes", "el dia 10 de cada mes", "todos los 15 de cada mes"
  // English: "the 1st of every month", "on day 10 of each month", "every 15th of the month"
  const eachMonthDayRegex = /\b(?:el\s+dia\s+|los\s+|the\s+|on\s+day\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+cada\s+mes|of\s+every\s+month|of\s+each\s+month|of\s+the\s+month)\b/i
  const eachMonthDayMatch = eachMonthDayRegex.exec(normalized)
  if (eachMonthDayMatch) {
    const day = parseInt(eachMonthDayMatch[1], 10)
    if (day >= 1 && day <= 31) {
      return { isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: day }
    }
  }

  // 2. Custom months recurrence with days: "los dias 5 de enero marzo y abril"
  // English: "on days 5 of january and march"
  const MONTH_MAP: Record<string, number> = {
    // Spanish
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
    noviembre: 11, diciembre: 12,
    // English
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  }
  const customMonthsRegex = /\b(?:el\s+dia\s+|los\s+dia\s+|los\s+|todos\s+los\s+|on\s+days\s+|on\s+day\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+|of\s+)([a-z\s,y&|and]+)\b/i
  const customMatch = customMonthsRegex.exec(normalized)
  if (customMatch) {
    const day = parseInt(customMatch[1], 10)
    const monthsText = customMatch[2]

    const foundMonths: number[] = []
    for (const mName of Object.keys(MONTH_MAP)) {
      if (new RegExp(`\\b${mName}\\b`).test(monthsText)) {
        foundMonths.push(MONTH_MAP[mName])
      }
    }

    if (foundMonths.length > 0 && day >= 1 && day <= 31) {
      // Eliminate duplicates
      const uniqueMonths = Array.from(new Set(foundMonths)).sort((a, b) => a - b)
      return {
        isRecurring: true,
        frequency: 'custom',
        months: uniqueMonths,
        dayOfMonth: day
      }
    }
  }

  // 3. Frecuencias simples estándar
  const dailyWords = ['todos los dias', 'cada dia', 'diariamente', 'diario', 'frecuencia diaria', 'every day', 'daily', 'each day']
  const weeklyWords = ['todas las semanas', 'cada semana', 'semanalmente', 'semanal', 'frecuencia semanal', 'every week', 'weekly', 'each week']
  const monthlyWords = ['todos los meses', 'cada mes', 'mensualmente', 'mensual', 'frecuencia mensual', 'every month', 'monthly', 'each month']
  const yearlyWords = ['todos los anos', 'cada ano', 'anualmente', 'anual', 'frecuencia anual', 'every year', 'yearly', 'each year']

  for (const w of dailyWords) {
    if (normalized.includes(w)) {
      return { isRecurring: true, frequency: 'daily', months: [], dayOfMonth: 1 }
    }
  }
  for (const w of weeklyWords) {
    if (normalized.includes(w)) {
      return { isRecurring: true, frequency: 'weekly', months: [], dayOfMonth: 1 }
    }
  }
  for (const w of monthlyWords) {
    if (normalized.includes(w)) {
      return { isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: new Date().getDate() }
    }
  }
  for (const w of yearlyWords) {
    if (normalized.includes(w)) {
      return { isRecurring: true, frequency: 'yearly', months: [], dayOfMonth: 1 }
    }
  }

  // Fallback si contiene "cada mes" o "todos los meses" pero de forma ambigua
  if (
    /\bcada\s+mes\b/.test(normalized) ||
    /\btodos\s+los\s+meses\b/.test(normalized) ||
    /\bevery\s+month\b/.test(normalized) ||
    /\beach\s+month\b/.test(normalized)
  ) {
    const dayMatch = /\b(\d{1,2})\b/.exec(normalized)
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10)
      if (day >= 1 && day <= 31) {
        return { isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: day }
      }
    }
    return { isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: new Date().getDate() }
  }

  return {
    isRecurring: false,
    frequency: 'monthly',
    months: [],
    dayOfMonth: 1
  }
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
  const { categoryId, exactMatch: categoryExact } = extractCategory(text, categories, kind)
  const { familyMemberId, exactMatch: memberExact } = extractFamilyMember(text, members, defaultMemberId)
  const note = extractNote(text)
  const isCash = extractIsCash(text)
  const recInfo = extractRecurring(text)

  const unrecognizedFields: ('amount' | 'category' | 'familyMember')[] = []
  if (amount === null) unrecognizedFields.push('amount')
  if (!categoryExact) unrecognizedFields.push('category')
  if (!memberExact) unrecognizedFields.push('familyMember')

  return {
    kind,
    amount,
    categoryId,
    familyMemberId,
    occurredOn,
    note,
    isCash,
    isRecurring: recInfo.isRecurring,
    frequency: recInfo.frequency,
    months: recInfo.months,
    dayOfMonth: recInfo.dayOfMonth,
    unrecognizedFields,
  }
}
