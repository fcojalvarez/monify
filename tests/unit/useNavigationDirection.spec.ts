import { describe, it, expect } from 'vitest'
import { useNavigationDirection } from '@/composables/useNavigationDirection'

describe('useNavigationDirection', () => {
  it('tiene "forward" como dirección y "slide-forward" como transición por defecto', () => {
    const { direction, transitionName } = useNavigationDirection()
    expect(direction.value).toBe('forward')
    expect(transitionName.value).toBe('slide-forward')
  })

  it('permite cambiar la dirección a "back" y actualiza la transición', () => {
    const { direction, transitionName, setDirection } = useNavigationDirection()
    
    setDirection('back')
    
    expect(direction.value).toBe('back')
    expect(transitionName.value).toBe('slide-back')
  })

  it('permite volver a cambiar la dirección a "forward"', () => {
    const { direction, transitionName, setDirection } = useNavigationDirection()
    
    setDirection('forward')
    
    expect(direction.value).toBe('forward')
    expect(transitionName.value).toBe('slide-forward')
  })
})
