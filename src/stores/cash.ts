import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cashService, type Cash } from '@/services/cash.service'

export const useCashStore = defineStore('cash', () => {
  const account = ref<Cash | null>(null)
  const loading = ref(false)

  const balance = computed(() => account.value?.balance ?? 0)

  async function fetch() {
    loading.value = true

    try {
      let cash = await cashService.get()

      if (!cash) {
        cash = await cashService.create()
      }

      account.value = cash
    } finally {
      loading.value = false
    }
  }

  async function deposit(amount: number) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.deposit(account.value.id, amount)
    await fetch()
  }

  async function withdraw(amount: number) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.withdraw(account.value.id, amount)
    await fetch()
  }

  async function setBalance(balance: number) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.setBalance(account.value.id, balance)
    await fetch()
  }

  function $reset() {
    account.value = null
    loading.value = false
  }

  return {
    account,
    balance,
    loading,
    fetch,
    deposit,
    withdraw,
    setBalance,
    $reset,
  }
})
