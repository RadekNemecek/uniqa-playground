import { id } from '@/lib/id'
import { pointsFor } from './scoring'
import { OPTION_COUNT } from './options'
import type {
  QuizAnswer,
  QuizHostState,
  QuizReport,
  QuizReportCell,
  QuizReportPlayer,
  QuizReportQuestion,
} from './types'

/**
 * Sestaví vyhodnocení z toho, co moderátorka drží v ruce. Počítá se
 * lokálně, protože všechny odpovědi i tak má ve svém listeneru.
 */
export function buildReport(state: QuizHostState, answers: QuizAnswer[], hostUid: string): QuizReport {
  const limitMs = state.setup.limitSeconds * 1000
  const mine = answers.filter((a) => a.round === state.round)

  // Pořadí hráčů je pořadí výsledkové listiny, ať se tabulka čte odshora.
  const players: QuizReportPlayer[] = Object.entries(state.scores)
    .map(([uid, score]) => ({
      uid,
      nick: state.nicks[uid] ?? 'Hráč',
      joinIndex: state.joinIndex[uid] ?? 0,
      score,
      answered: 0,
      correct: 0,
    }))
    .sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick, 'cs'))

  const at = new Map(players.map((p, i) => [p.uid, i]))

  const questions: QuizReportQuestion[] = []
  const matrix: Array<Array<QuizReportCell | null>> = []

  state.questions.forEach((q, index) => {
    const row: Array<QuizReportCell | null> = players.map(() => null)
    const byChoice = Array.from({ length: OPTION_COUNT }, () => 0)
    let answered = 0
    let correct = 0
    let sumMs = 0

    for (const a of mine.filter((x) => x.qid === q.qid)) {
      const column = at.get(a.uid)
      if (column === undefined) continue
      const hit = a.choice === q.correctIndex
      const points = pointsFor(hit, a.elapsedMs, limitMs)
      row[column] = { c: a.choice, ms: a.elapsedMs, p: points }
      if (a.choice >= 0 && a.choice < OPTION_COUNT) byChoice[a.choice]! += 1
      answered += 1
      players[column]!.answered += 1
      if (hit) {
        correct += 1
        players[column]!.correct += 1
        sumMs += a.elapsedMs
      }
    }

    questions.push({
      qid: q.qid,
      index,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      note: q.note,
      packName: q.packName,
      // Kdo se připojil později, se do „byl u toho" nepočítá. Jinak by
      // úspěšnost otázky klesla kvůli někomu, kdo ji vůbec neviděl.
      present: players.filter((p) => p.joinIndex <= index).length,
      answered,
      correct,
      byChoice,
      avgMs: correct > 0 ? Math.round(sumMs / correct) : 0,
    })
    matrix.push(row)
  })

  return {
    schema: 1,
    id: id('r'),
    hostUid,
    code: state.code,
    round: state.round,
    packNames: [...new Set(state.questions.map((q) => q.packName))],
    startedAt: state.startedAt,
    finishedAt: Date.now(),
    questions,
    players,
    matrix,
  }
}

/** Úspěšnost otázky v procentech z těch, kdo u ní byli. */
export function successRate(q: QuizReportQuestion): number {
  return q.present > 0 ? Math.round((q.correct / q.present) * 100) : 0
}

/** Otázky od nejhůř zvládnuté. To je to, co školitelka hledá. */
export function byDifficulty(report: QuizReport): QuizReportQuestion[] {
  return [...report.questions].sort((a, b) => successRate(a) - successRate(b) || a.index - b.index)
}

/* --- Export ---------------------------------------------------------------- */

/** Středník a BOM, aby to Excel v české lokalizaci otevřel rovnou správně. */
function csvCell(value: string | number): string {
  const text = String(value)
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function reportToCsv(report: QuizReport): string {
  const lines: string[] = []

  lines.push(['Otázka', 'Balíček', 'Správná odpověď', 'Byli u toho', 'Odpovědělo', 'Správně', 'Úspěšnost %', 'Průměr s'].map(csvCell).join(';'))
  for (const q of byDifficulty(report)) {
    lines.push(
      [
        `${q.index + 1}. ${q.prompt}`,
        q.packName,
        q.options[q.correctIndex] ?? '',
        q.present,
        q.answered,
        q.correct,
        successRate(q),
        (q.avgMs / 1000).toFixed(1).replace('.', ','),
      ]
        .map(csvCell)
        .join(';'),
    )
  }

  lines.push('')
  lines.push(['Hráč', 'Body', 'Odpovědělo', 'Správně', ...report.questions.map((q) => `${q.index + 1}.`)].map(csvCell).join(';'))
  report.players.forEach((p, column) => {
    const cells = report.questions.map((q, row) => {
      if (p.joinIndex > q.index) return '-'
      const cell = report.matrix[row]?.[column]
      if (!cell) return ''
      return cell.c === q.correctIndex ? 'ano' : 'ne'
    })
    lines.push([p.nick, p.score, p.answered, p.correct, ...cells].map(csvCell).join(';'))
  })

  return `﻿${lines.join('\r\n')}\r\n`
}

export function downloadReport(report: QuizReport): void {
  const blob = new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date(report.finishedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `kviz-${stamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
