import type { Category, FamilyMember } from '@/types'
import { parseVoiceCommand, type ParsedVoiceTransaction } from '@/utils/voiceParser'

export async function parseWithAI(
  text: string,
  categories: Category[],
  familyMembers: FamilyMember[],
  defaultFamilyMemberId: string,
  apiKey: string,
): Promise<{ parsed: ParsedVoiceTransaction; usedAI: boolean }> {
  if (!apiKey || !apiKey.trim()) {
    // Graceful fallback to local parser
    const parsed = parseVoiceCommand(text, categories, familyMembers, defaultFamilyMemberId)
    return { parsed, usedAI: false }
  }

  const categoriesList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
  }))

  const familyMembersList = familyMembers.map((m) => ({
    id: m.id,
    name: m.name,
  }))

  const currentDate = new Date().toISOString().split('T')[0]

  const systemInstruction = `Eres un asistente de inteligencia artificial para una aplicación de control de gastos e ingresos llamada Monify.
Tu tarea es analizar un comando de voz o de texto transcrito y convertirlo en un objeto JSON estructurado que represente un movimiento financiero (gasto o ingreso).

Información del sistema:
- Fecha de hoy (día actual): ${currentDate}
- Miembros de la familia disponibles: ${JSON.stringify(familyMembersList)}
- Categorías disponibles: ${JSON.stringify(categoriesList)}
- Miembro de la familia por defecto (ID): "${defaultFamilyMemberId}"

Instrucciones de análisis:
1. "kind": Determina si es un gasto ("expense") o un ingreso ("income"). Si no está claro o no se menciona, asume "expense" por defecto.
2. "amount": Extrae el importe numérico de la transacción (ej. "43.50", "veinticinco", "dos con cincuenta" -> 2.50). Si no se especifica o no se detecta ningún importe, ponlo en null o no lo incluyas en las propiedades del JSON.
3. "categoryId": Busca la categoría que mejor se adapte según lo mencionado en la frase, comparando con el nombre y que coincida en su tipo ("kind"). Si no encuentras ninguna coincidencia clara, usa la primera categoría disponible del tipo ("kind") correspondiente, y añade "category" a "unrecognizedFields".
4. "familyMemberId": Determina a qué miembro pertenece la transacción. Si no se menciona ningún miembro o no coincide con los disponibles, usa el ID del miembro por defecto ("${defaultFamilyMemberId}") y añade "familyMember" a "unrecognizedFields".
5. "occurredOn": Determina la fecha en formato "YYYY-MM-DD". Interpreta referencias relativas como "hoy", "ayer", "mañana", o días específicos de la semana relativos a la fecha de hoy que es ${currentDate}. Si no se especifica fecha, usa hoy (${currentDate}).
6. "note": Extrae conceptos o descripciones adicionales opcionales (ej. "compra en Mercadona", "pago de luz"). Si hay alguna descripción que no corresponde a la categoría o miembro directamente, ponla como nota. Evita incluir las palabras clave de activación ("con nota", "concepto de").
7. "isCash": Establece true si el usuario indica que se realiza en efectivo, metálico, cash, cartera o similar. Establece false si indica banco, tarjeta, transferencia, o por defecto.
8. "isRecurring": Establece true si detectas expresiones de repetición (ej. "todos los meses", "cada lunes", "diariamente", "mensual").
9. "frequency": Si es recurrente, determina la frecuencia ("daily", "weekly", "monthly", "yearly", "custom").
10. "months": Si la frecuencia es "custom" (ej. "los meses de enero y marzo"), añade los números de los meses (1-12) en el array. Si no, déjalo vacío.
11. "dayOfMonth": Si la frecuencia es "monthly" o "custom", indica el día del mes (1-31) en que debe ejecutarse. Por defecto 1 o el día de la fecha de inicio.
12. "unrecognizedFields": Un array de strings que contiene "amount" si no se detectó un importe válido, "category" si se seleccionó una categoría predeterminada/por defecto por falta de coincidencia, y/o "familyMember" si se seleccionó el miembro por defecto por falta de coincidencia.`

  const prompt = `Analiza la siguiente transcripción y genera el JSON correspondiente según el esquema solicitado:
"${text}"`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              kind: { type: 'STRING', enum: ['expense', 'income'] },
              amount: { type: 'NUMBER' },
              categoryId: { type: 'STRING' },
              familyMemberId: { type: 'STRING' },
              occurredOn: { type: 'STRING' },
              note: { type: 'STRING' },
              isCash: { type: 'BOOLEAN' },
              isRecurring: { type: 'BOOLEAN' },
              frequency: {
                type: 'STRING',
                enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
              },
              months: { type: 'ARRAY', items: { type: 'INTEGER' } },
              dayOfMonth: { type: 'INTEGER' },
              unrecognizedFields: {
                type: 'ARRAY',
                items: { type: 'STRING', enum: ['amount', 'category', 'familyMember'] },
              },
            },
            required: [
              'kind',
              'categoryId',
              'familyMemberId',
              'occurredOn',
              'note',
              'isCash',
              'isRecurring',
              'frequency',
              'months',
              'dayOfMonth',
              'unrecognizedFields',
            ],
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(
        `[AI Parser] Gemini API returned error: ${response.status} - ${errorText}. Falling back to local parser.`,
      )
      const parsed = parseVoiceCommand(text, categories, familyMembers, defaultFamilyMemberId)
      return { parsed, usedAI: false }
    }

    const data = await response.json()
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!contentText) {
      console.warn('[AI Parser] Empty content from Gemini. Falling back to local parser.')
      const parsed = parseVoiceCommand(text, categories, familyMembers, defaultFamilyMemberId)
      return { parsed, usedAI: false }
    }

    const parsed = JSON.parse(contentText)

    return {
      parsed: {
        kind: parsed.kind || 'expense',
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        categoryId: parsed.categoryId || '',
        familyMemberId: parsed.familyMemberId || defaultFamilyMemberId,
        occurredOn: parsed.occurredOn || currentDate,
        note: parsed.note || '',
        isCash: !!parsed.isCash,
        isRecurring: !!parsed.isRecurring,
        frequency: parsed.frequency || 'monthly',
        months: Array.isArray(parsed.months) ? parsed.months : [],
        dayOfMonth: typeof parsed.dayOfMonth === 'number' ? parsed.dayOfMonth : 1,
        unrecognizedFields: Array.isArray(parsed.unrecognizedFields)
          ? parsed.unrecognizedFields
          : [],
      },
      usedAI: true,
    }
  } catch (err) {
    console.warn('[AI Parser] Error during Gemini API call. Falling back to local parser.', err)
    const parsed = parseVoiceCommand(text, categories, familyMembers, defaultFamilyMemberId)
    return { parsed, usedAI: false }
  }
}
