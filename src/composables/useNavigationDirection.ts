import { computed, ref } from 'vue'

export type NavigationDirection = 'forward' | 'back'

const direction = ref<NavigationDirection>('forward')

export function useNavigationDirection() {
  const transitionName = computed(() =>
    direction.value === 'forward' ? 'slide-forward' : 'slide-back',
  )

  function setDirection(value: NavigationDirection) {
    direction.value = value
  }

  return {
    direction,
    transitionName,
    setDirection,
  }
}
