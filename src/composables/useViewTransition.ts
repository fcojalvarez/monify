/**
 * Envuelve la View Transitions API con degradación elegante:
 * si el navegador no la soporta (o el usuario prefiere menos movimiento),
 * ejecuta el cambio directamente sin animar.
 */
export type TransitionDirection = 'forward' | 'back' | 'none'

/** Acceso seguro a la API aunque `lib.dom` aún no la tipe en esta versión de TS. */
interface DocumentWithViewTransition {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> }
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useViewTransition() {
  const isSupported =
    typeof document !== 'undefined' && 'startViewTransition' in document

  /**
   * Ejecuta `update` dentro de una view transition.
   * `direction` marca el sentido para elegir la animación en transitions.css.
   */
  function run(update: () => void | Promise<void>, direction: TransitionDirection = 'none') {
    if (!isSupported || prefersReducedMotion()) {
      void update()
      return
    }

    const root = document.documentElement
    if (direction === 'none') root.removeAttribute('data-transition')
    else root.dataset.transition = direction

    const doc = document as Document & DocumentWithViewTransition
    const transition = doc.startViewTransition!(() => update())
    transition.finished.finally(() => root.removeAttribute('data-transition'))
  }

  return { isSupported, run }
}
