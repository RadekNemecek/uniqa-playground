# Playground

Interaktivní hry pro školení týmů. První hra je **Riskuj**: deska kategorií
a bodových hodnot, jeden až šest týmů, vlastní otázky, časomíra a bonusová
pole. Běží jako statická webová aplikace, hostovaná na GitHub Pages.

Projekt je stavěný tak, aby další hra byla přírůstek, ne přestavba: hry jsou
moduly v `src/games/`, evidované v `src/games/registry.ts`.

## Rychlý start

```bash
npm install
npm run dev
```

Aplikace naběhne bez jakéhokoli nastavení. Dokud není vyplněná konfigurace
Firebase, ukládá data do prohlížeče (režim `local`), takže se dá hned zkoušet.
Při prvním spuštění se založí ukázkový balíček otázek.

## Jak se hra vede

1. **Otázky** připravíš předem v sekci *Otázky*. Mřížka v editoru odpovídá
   přesně té, kterou uvidí hráči.
2. **Hrát** otevře přípravu: vybereš balíček, kategorie, týmy a pravidla.
3. Na desce klikneš na políčko, zobrazí se otázka. Správnou odpověď
   neznáš, odhalíš ji dalším kliknutím nebo mezerníkem.
4. Vyhodnotíš **Správně** nebo **Špatně**. Při správné odpovědi se políčko
   obarví barvou týmu a body přiskočí, při špatné políčko zčerná.
5. Když odpověděl jiný tým, použij pruh *Body přiznat jinému týmu*.

### Klávesnice

| klávesa | co dělá |
|---|---|
| šipky | pohyb po desce |
| Enter | otevře políčko, potom potvrdí správnou odpověď |
| mezerník | odhalí správnou odpověď |
| 1 az 6 | přizná body danému týmu |
| N nebo 0 | neuhodl nikdo |
| Esc | zavře políčko bez bodování |

Tlačítko **Zpět** vrátí poslední bodování včetně stavu políčka. Rozehraná hra
přežije obnovení stránky i pád prohlížeče.

## Nasazení a sdílení otázek

Aby otázky viděli i kolegové a nemusely se přenášet ručně, připojí se projekt
k Firebase Firestore. Celý postup je v [`DEPLOY.md`](DEPLOY.md).

## Logo UNIQA

V repozitáři záměrně není. Vizuál je vlastní, neutrální, aby aplikace
nepůsobila jako oficiální nástroj pojišťovny. Kdyby marketing UNIQA použití
značky schválil, patří logo do `public/` a do hlavičky v
`src/components/AppHeader.vue`, kde je dnes textová značka Playground.

## Skripty

| příkaz | co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | kontrola typů a produkční sestavení |
| `npm run preview` | náhled produkčního sestavení |
| `npm run typecheck` | jen kontrola typů |
| `npm run icons` | vygeneruje ikony aplikace z předlohy |

## Struktura

```
src/
  games/riskuj/     hra Riskuj: komponenty a ukázkový balíček
  games/registry.ts seznam her na rozcestníku
  components/admin/ správa balíčků a otázek
  components/ui/    sdílené prvky rozhraní
  stores/           stav: balíčky, hra, nastavení, oznámení
  lib/              úložiště, Firebase, animace, zvuk, konfety
  styles/tokens.css jediné místo pro barvy, mezery, písma a časování
```
