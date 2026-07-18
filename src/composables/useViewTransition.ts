import { nextTick } from 'vue'

export type TransitionDirection = 'forward' | 'back' | 'none'

const isSSR = typeof window === 'undefined'
const prefersReducedMotion =
  !isSSR && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// Comprobamos la existencia del método nativo en el documento
const isSupported = !isSSR && 'startViewTransition' in document

export function useViewTransition() {
  /**
   * Ejecuta una mutación de estado asegurando la captura correcta del DOM en Vue.
   * @param update Callback con la mutación de estado (síncrona o asíncrona)
   * @param direction Dirección expuesta en `data-transition` para CSS
   */
  async function run(update: () => void | Promise<void>, direction: TransitionDirection = 'none') {
    if (!isSupported || prefersReducedMotion) {
      await update()
      return
    }

    const root = document.documentElement

    if (direction === 'none') {
      root.removeAttribute('data-transition')
    } else {
      root.dataset.transition = direction
    }

    try {
      document.startViewTransition(async () => {
        await update()
        await nextTick()
      })
    } catch (error) {
      await update()
      console.error('ViewTransition falló, ejecutando fallback:', error)
    } finally {
      root.removeAttribute('data-transition')
    }
  }

  return {
    isSupported,
    run,
  }
}
