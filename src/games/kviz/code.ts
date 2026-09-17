/**
 * Abeceda bez záměnitelných znaků. Chybí 0 a O, 1 a I a L, 5 a S, 2 a Z,
 * 8 a B. Kód se čte z druhého konce místnosti a přepisuje do telefonu,
 * takže jeden ušetřený znak nestojí za jediné „pane, ta nula, nebo písmeno?".
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679'
const LENGTH = 5

/** Kombinace, které by v místnosti zněly nemístně. Losuje se znovu. */
const BLOCKED = ['KURVA', 'PICA', 'HOVNO', 'SRACK', 'DEBIL', 'JEBAT']

export function randomCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = new Uint8Array(LENGTH)
    crypto.getRandomValues(bytes)
    // Odmítnutí zbytku by bylo přesnější, ale 256 % 25 dělá rozdíl v řádu
    // procenta a kód se nelosuje kvůli bezpečnosti, nýbrž kvůli obsazenosti.
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
    if (!BLOCKED.some((bad) => code.includes(bad))) return code
  }
  return Array.from({ length: LENGTH }, () => ALPHABET[0]).join('')
}

/**
 * Srovná, co člověk přepsal z plátna. Malá písmena a mezery projdou,
 * záměna nuly za O ne: v abecedě nula není, takže by kód beztak neexistoval
 * a mlčky uhodnutá oprava by byla horší než poctivá hláška.
 */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '').slice(0, LENGTH)
}

export function isCodeShaped(code: string): boolean {
  return code.length === LENGTH && [...code].every((ch) => ALPHABET.includes(ch))
}

export { LENGTH as CODE_LENGTH }
