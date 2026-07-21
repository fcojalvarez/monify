/**
 * Calcula cuántas carteras pueden mostrarse en una fila, reservando espacio
 * para el indicador de carteras restantes solo cuando es necesario.
 */
export function getVisibleWalletCount(
  availableWidth: number,
  walletWidths: number[],
  moreWidth: number,
  gap = 8,
) {
  let usedWidth = 0
  let visibleCount = 0

  // Primero intentamos mostrar todas las carteras sin el indicador
  for (const [index, walletWidth] of walletWidths.entries()) {
    const walletGap = visibleCount > 0 ? gap : 0

    if (usedWidth + walletGap + walletWidth > availableWidth) break

    usedWidth += walletGap + walletWidth
    visibleCount += 1
  }

  // Si todas las carteras caben, devolvemos el total
  if (visibleCount === walletWidths.length) {
    return visibleCount
  }

  // Si no caben todas, recalculamos reservando espacio para el indicador
  usedWidth = 0
  visibleCount = 0

  for (const [index, walletWidth] of walletWidths.entries()) {
    const remainingCount = walletWidths.length - index - 1
    const walletGap = visibleCount > 0 ? gap : 0
    const moreSpace = remainingCount > 0 ? moreWidth + gap : 0

    if (usedWidth + walletGap + walletWidth + moreSpace > availableWidth) break

    usedWidth += walletGap + walletWidth
    visibleCount += 1
  }

  return visibleCount
}
