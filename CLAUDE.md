# Playground: konvence projektu

Vue 3 + Vite + TypeScript, statická aplikace na GitHub Pages, data ve
Firestore. Hra Riskuj je první, další mají přibývat jako moduly.

Kontext, proč projekt vznikl, je v `README.md`, nasazení v `DEPLOY.md`.

## Co nesmíš porušit

- **Žádné syrové hodnoty.** Barva, mezera, velikost písma, poloměr a trvání
  animace vždy přes `var(--token)` z `src/styles/tokens.css`. Novou hodnotu
  nejdřív přidej mezi tokeny.
- **Pohyb se dá vypnout.** Každá animace musí respektovat
  `prefers-reduced-motion`. Tokeny trvání jdou v tom režimu na 1 ms, takže
  animace psané přes tokeny to řeší samy. Klíčové snímky s `animation`
  vypni explicitně.
- **Kontrast textu nejméně 4,5:1.** Týkalo se to hlavně barev týmů, ty jsou
  volené tak, aby na nich držel tmavý text `--c-text-ink`.
- **Tým se nikdy nerozlišuje jen barvou.** Vždy je vedle ní i písmeno.
- **Deska se vejde na jednu obrazovku.** Na projektoru se nescrolluje.
- **Hra přežije obnovení stránky.** Stav se ukládá po každé akci.
- **Texty česky, bez dlouhých pomlček.**

## Data

`src/lib/db.ts` je rozhraní úložiště. Aplikace nikdy nesahá na Firestore
přímo. Implementace jsou dvě:

- `LocalDb` nad `localStorage`, jede bez jakéhokoli nastavení,
- `FirestoreDb` v `src/lib/firebase.ts`, zapne se, jakmile je vyplněný
  `src/lib/firebase.config.ts`.

`npm run dev:local` vynutí lokální režim i s vyplněnou konfigurací. Používej
ho, když zkoušíš něco, co by nemělo sáhnout na sdílená data.

Balíček otázek je **jeden dokument**, ne kolekce. Menší deska znamená
jednotky kilobajtů proti limitu 1 MB a získáme tím atomické ukládání,
jeden listener a triviální duplikaci. Cenou je, že při souběžné editaci
vyhraje poslední zápis; editor na to upozorní.

Hra si otázky při startu **zamrazí** do svého stavu. Úprava balíčku
uprostřed hry nesmí změnit desku, která běží na projektoru.

## Reaktivita bez knihoven navíc

Stavy jsou obyčejné reaktivní singletony v `src/stores/`. Žádná Pinia.
Zapisuje se výhradně přes exportované funkce, aby změna vždy prošla
úložištěm.

Na hluboké kopie používej `clone()` z `src/lib/clone.ts`.
`structuredClone` na reaktivních objektech z Vue selže.

## Přidání další hry

1. Nový adresář `src/games/<slug>/`.
2. Položka v `src/games/registry.ts`.
3. Routa v `src/router/index.ts` a pohled v `src/views/`.
4. Sdílené prvky ber z `src/components/ui/`.

## Ověření změn

```bash
npm run typecheck
npm run build
```

Vizuál se neověří jinak než pohledem. Projdi hru v prohlížeči, na šířkách
1280 a 1920, s vypnutými animacemi a v režimu offline.
