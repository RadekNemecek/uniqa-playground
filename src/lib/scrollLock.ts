/**
 * Zámek rolování stránky pod otevřeným oknem.
 *
 * Musí to být čítač, ne přepínač. Potvrzení se umí otevřít nad už
 * otevřeným oknem (třeba „opravdu smazat?" nad editorem balíčku) a když
 * se zavřelo to vrchní, prosté `overflow = ''` odemklo rolování i pod tím
 * spodním, které pořád stálo na obrazovce. Stránka se pak pod dialogem
 * rozjela.
 */

let depth = 0
let previous = ''

export function lockScroll(): void {
  if (depth === 0) {
    previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  depth += 1
}

export function unlockScroll(): void {
  if (depth === 0) return
  depth -= 1
  if (depth === 0) document.body.style.overflow = previous
}
