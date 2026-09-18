/** Jedna možnost segmentovaného přepínače. */
export interface Segment<T extends string | number> {
  value: T
  label: string
  disabled?: boolean
}
