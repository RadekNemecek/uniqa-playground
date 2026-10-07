import type { VyslechAnswer, VyslechQuestion, VyslechReport } from './types'

/**
 * Tabulka pro Excel. Středník a BOM, protože český Excel čárku bere jako
 * desetinnou a bez BOM rozsype diakritiku.
 */
function cell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function render(q: VyslechQuestion, value: VyslechAnswer | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map((i) => q.options[i] ?? '').filter(Boolean).join(', ')
  if (q.kind === 'single') return q.options[value] ?? ''
  return String(value)
}

export function reportToCsv(report: VyslechReport): string {
  const head = ['#', ...report.questions.map((q) => q.prompt)]
  const rows = report.responses.map((r, i) => [
    String(i + 1),
    ...report.questions.map((q) => render(q, r[q.id])),
  ])
  const lines = [head, ...rows].map((row) => row.map(cell).join(';'))
  return `﻿${lines.join('\r\n')}\r\n`
}

export function downloadVyslechCsv(report: VyslechReport): void {
  const blob = new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date(report.finishedAt).toISOString().slice(0, 10)
  const slug = report.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  a.href = url
  a.download = `vyslech-${stamp}${slug ? `-${slug}` : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
