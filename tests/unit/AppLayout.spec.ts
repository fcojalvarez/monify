import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useNavigationDirection } from '@/composables/useNavigationDirection'

vi.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/dashboard' }),
  RouterView: {
    name: 'RouterView',
    render(this: any) {
      return h(
        'div',
        { class: 'router-view-stub' },
        this.$slots.default ? this.$slots.default({ Component: 'div' }) : null
      )
    }
  },
}))

describe('AppLayout', () => {
  const mountLayout = () => {
    return mount(AppLayout, {
      global: {
        stubs: {
          AppHeader: { template: '<header class="app-header-stub" />' },
          BottomNavigation: { template: '<nav class="bottom-navigation-stub" />' },
        },
      },
    })
  }

  it('renderiza AppHeader, BottomNavigation y RouterView', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('.app-header-stub').exists()).toBe(true)
    expect(wrapper.find('.bottom-navigation-stub').exists()).toBe(true)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })

  it('usa la clase de transición correcta según la dirección de navegación', async () => {
    const wrapper = mountLayout()
    const { setDirection } = useNavigationDirection()

    // Dirección por defecto: forward -> slide-forward
    setDirection('forward')
    await nextTick()
    
    // En Vue Test Utils, Transition se stubbea automáticamente a transition-stub
    const transition = wrapper.find('transition-stub')
    expect(transition.exists()).toBe(true)
    expect(transition.attributes('name')).toBe('slide-forward')

    // Cambiamos la dirección a: back -> slide-back
    setDirection('back')
    await nextTick()

    expect(transition.attributes('name')).toBe('slide-back')
  })
})
