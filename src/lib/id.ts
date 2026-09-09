/** Krátký náhodný identifikátor. Nepotřebujeme kryptografickou sílu,
 *  jen jistotu, že se dva záznamy nesrazí. */
export function id(prefix = ''): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const s = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
  return prefix ? `${prefix}_${s}` : s
}
