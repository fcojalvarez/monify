import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'

type Tree = { [key: string]: string | Tree }

function flatKeys(obj: Tree, prefix = ''): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      keys.push(...flatKeys(value as Tree, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

describe('paridad de locales i18n', () => {
  it('es.json y en.json exponen exactamente el mismo conjunto de claves', () => {
    const esKeys = flatKeys(es as Tree).sort()
    const enKeys = flatKeys(en as Tree).sort()

    const missingInEn = esKeys.filter((k) => !enKeys.includes(k))
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k))

    expect(missingInEn, `Claves presentes en es pero no en en: ${missingInEn.join(', ')}`).toEqual([])
    expect(missingInEs, `Claves presentes en en pero no en es: ${missingInEs.join(', ')}`).toEqual([])
  })

  it('no hay valores vacíos en ninguno de los dos idiomas', () => {
    const check = (obj: Tree, prefix = ''): string[] => {
      const empties: string[] = []
      for (const key of Object.keys(obj)) {
        const value = obj[key]
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object') empties.push(...check(value as Tree, path))
        else if (typeof value === 'string' && value.trim() === '') empties.push(path)
      }
      return empties
    }

    expect(check(es as Tree)).toEqual([])
    expect(check(en as Tree)).toEqual([])
  })
})
