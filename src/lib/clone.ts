/**
 * Hluboká kopie dat balíčku a hry.
 *
 * `structuredClone` na reaktivních objektech z Vue selže, protože klonuje
 * i Proxy. Všechna naše data jsou čistý JSON, takže tahle cesta je bezpečná
 * a navíc zahodí případné `undefined`, které stejně nechceme ukládat.
 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
