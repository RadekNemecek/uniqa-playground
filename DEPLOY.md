# Nasazení

Dvě části, každá zabere pár minut: **Firebase** (kde žijí otázky) a
**GitHub Pages** (kde běží aplikace). Jde je udělat v libovolném pořadí,
aplikace funguje i bez Firebase, jen se otázky neukládají do cloudu.

---

## 1. Firebase Firestore

Projekt v konzoli už existuje. Následující čtyři kroky se dělají jednou
a pak se k nim nevracíš.

### 1.1 Založit databázi

1. V levém menu **Build → Firestore Database**, tlačítko **Create database**.
2. **Database ID** nech `(default)`. Aplikace jinou databázi nehledá.
3. **Location**: vyber **`europe-west3 (Frankfurt)`**.
   Je nejblíž a odezva bude nejnižší.
   **Tohle už nikdy nezměníš**, jediná cesta zpět je založit nový projekt.
4. **Rules**: vyber **Start in production mode**, tedy zamčeno.
   Test mode by databázi na měsíc otevřel komukoli, a to nechceme.
   Vlastní pravidla vložíme v kroku 1.3.
5. **Create**. Chvíli to zřizuje, pak se objeví prázdná záložka *Data*.

### 1.2 Zapnout anonymní přihlášení

Bez tohohle kroku aplikace nic nepřečte ani nezapíše. Klient se přihlašuje
anonymně, uživatelka o tom neví, ale pravidla podle toho poznají relaci.

1. V levém menu **Build → Authentication → Get started**.
2. Záložka **Sign-in method**.
3. V seznamu **Native providers** klikni na **Anonymous**.
4. Přepnout na **Enable** a **Save**.

Ověření: v seznamu poskytovatelů má být u *Anonymous* stav **Enabled**.

### 1.3 Vložit pravidla

1. **Build → Firestore Database**, záložka **Rules**.
2. Smaž celý obsah editoru a vlož místo něj **celý** soubor
   [`firestore.rules`](firestore.rules) z tohohle repozitáře.
3. **Publish**. Nahoře se musí objevit potvrzení, že jsou pravidla nasazená.

Pravidla se občas změní spolu s aplikací. Když přibude něco, co hráč
zapisuje, je potřeba je publikovat znovu, jinak server nový zápis odmítne.
Naposledy se to stalo s **obrázky k otázkám kvízu**: přibyla kolekce
`quizImages`, kterou čte kdokoli a zapisuje jen odemčená správa. Bez
publikovaných pravidel se obrázek nenahraje a otázka zůstane bez něj.

Co pravidla dělají:

- balíčky desky Pojišťuj! smí **číst kdokoli**, kdo má odkaz na hru,
- **zapisovat** smí jen ten, kdo prokázal znalost hesla do správy,
- otisk hesla v `config/admin` **nesmí přečíst nikdo**, ani přihlášený
  klient. Pravidla si ho přečíst umí, a na tom je celá ochrana postavená,
- připravené balíčky kvízu Na kolik to dáš? smí **číst kdokoli**, aby šla
  hra připravit a spustit bez hesla. Vytvářet, upravovat a mazat je smí
  jen odemčená správa,
- **obrázky k otázkám** v kolekci `quizImages` platí totéž. Každý obrázek
  je vlastní dokument s daty v base64, pravidlo navíc hlídá strop, aby se
  do databáze nedostalo nic, co by se přes rozhraní nevešlo,
- běžící hru kvízu si přečte každý, kdo zná pětiznakový kód, ale není
  v ní znění otázky ani správná možnost, dokud ji moderátorka neodhalí,
- hráč smí zapsat **jednu** odpověď na otázku a jen dokud otázka běží.
  Pozdní odpověď odmítne server, ne prohlížeč moderátorky.

Konzole u řádků s `get()` a `exists()` může hlásit varování o počtu čtení.
Je to v pořádku, tyhle dotazy se dělají jen při zápisu.

### 1.4 Zaregistrovat webovou aplikaci a opsat konfiguraci

1. Nahoře vlevo ozubené kolo vedle **Project Overview** → **Project settings**.
2. Záložka **General**, sjeď dolů na **Your apps**.
3. Klikni na ikonu webu **`</>`**.
4. **App nickname** třeba `playground`.
   **Firebase Hosting nezaškrtávej**, hostuje GitHub Pages.
5. **Register app**.
6. Google ukáže kus kódu s objektem `firebaseConfig`. Vypadá takhle:

```js
const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "playground-xxxxx.firebaseapp.com",
  projectId: "playground-xxxxx",
  storageBucket: "playground-xxxxx.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

7. Těch šest hodnot přepiš do
   [`src/lib/firebase.config.ts`](src/lib/firebase.config.ts). Uvozovky
   nech jednoduché, na typu uvozovek nezáleží, ale drž se stylu souboru.

Kdybys stránku s konfigurací zavřel, najdeš ji znovu ve **Project settings
→ General → Your apps → SDK setup and configuration → Config**.

**Tyhle hodnoty jsou veřejné a patří do repozitáře.** Firebase je tak
navržený: klíč jen říká, ke kterému projektu se klient hlásí. Kdo smí co
číst a zapisovat, rozhodují pravidla na straně Google. Není to tajemství,
které by šlo zneužít.

### 1.5 Vyzkoušet, že to opravdu jede

```bash
npm run dev
```

1. Otevři `http://localhost:5173/uniqa-playground/` (port ti Vite vypíše).
2. Jdi na **Otázky**. Musí se nabídnout **Nastav heslo**, ne přihlašovací
   pole. To znamená, že se aplikace k databázi dostala a ví, že heslo
   ještě nikdo nenastavil.
3. Nastav heslo. **Zapiš si ho**, obnovit ho jde jedině smazáním dokumentu
   `config/admin` ve Firebase konzoli.
4. Klikni na **Vytvořit ukázkový balíček**.
5. Vrať se do konzole, **Firestore Database → Data**. Musíš tam vidět:

| kolekce | dokument | co v něm je |
|---|---|---|
| `config` | `admin` | `keyHash`, otisk hesla |
| `config` | `public` | `initialized: true` |
| `unlocks` | dlouhé id | `keyHash`, doklad o odemčení tvé relace |
| `packs` | `p_...` | balíček otázek pro desku Pojišťuj! |
| `quizPacks` | `kp_...` | balíček otázek pro kvíz Na kolik to dáš? |
| `quizReports` | `r_...` | vyhodnocení odehraného kvízu |

6. Poslední zkouška: otevři stejnou adresu v jiném prohlížeči nebo
   v anonymním okně. Balíček se musí objevit, aniž bys tam cokoli dělal.
   Tím je ověřené, že data opravdu žijí v cloudu a kolegové je uvidí.

### 1.6 Úklid po kvízu

Každá odehraná hra kvízu založí dokument v kolekci `quiz` a pod ním
podkolekce `players` a `answers`. Tlačítko **Ukončit a uklidit** na konci
hry je všechny smaže.

Pojistka pro případ, že školitelka jen zavřela notebook, je **TTL
politika**. Ve Firestore ji najdeš pod **Firestore Database → Time-to-live
(TTL)** a nastavuje se pro každou skupinu kolekcí zvlášť:

| skupina kolekcí | pole |
|---|---|
| `quiz` | `expiresAt` |
| `players` | `expiresAt` |
| `answers` | `expiresAt` |

Nastav všechny tři. **Smazání dokumentu ve Firestore nemaže jeho
podkolekce**, takže bez politiky nad `players` a `answers` by po hrách
zůstávaly osiřelé dokumenty, které se v konzoli ani neukážou.

#### Jak dlouho držet vyhodnocení

Vyhodnocení v kolekci `quizReports` se **nemaže samo** a jsou v něm
přezdívky účastníků. Přezdívku si píše účastník sám, takže to může být
křestní jméno i celé jméno; je to osobní údaj a nemá ležet v databázi
napořád jen proto, že ho nikdo nesmazal.

Doporučená doba uchování je **jedna sezóna školení, tedy zhruba rok**.
Do té doby je vyhodnocení k něčemu (dá se srovnat, jak na tom skupina
byla dřív), potom už je to jen zátěž.

Dvě cesty, jak to dodržet:

1. **Ručně.** Seznam vyhodnocení je na `/kviz/vysledky`, tedy pod
   záložkou *Výsledky* vedle *Hrát* a *Otázky*, a u každého je
   tlačítko na smazání.
2. **Automaticky.** Přidej TTL politiku i nad `quizReports` nad polem
   `expiresAt` a do ukládaného dokumentu to pole doplň. Firestore pak
   záznam smaže sám a nikdo na to nemusí myslet.

Kdo se ptá, co se s jeho přezdívkou stane, má dostat tuhle odpověď:
zůstane ve vyhodnocení školení, nikam se neposílá a po roce se maže.

Session platí osm hodin. Po vypršení ji smí uklidit kdokoli, takže
zabraný kód se sám uvolní i tehdy, když se původní počítač už nikdy
nepřipojí.

### 1.7 Když to nejede

| co vidíš | co s tím |
|---|---|
| `auth/configuration-not-found` | Není zapnuté anonymní přihlášení, krok 1.2. |
| `Missing or insufficient permissions` při čtení | Nejsou publikovaná pravidla, krok 1.3. |
| Uložení otázky se nepovede | Nejsi odemčený, nebo pravidla nejsou publikovaná. |
| Správa nabízí „Zadej heslo", i když jsi žádné nenastavil | Heslo už kdysi nastavené bylo. Smaž dokument `config/admin` i `config/public` v konzoli a načti stránku znovu. |
| Aplikace jede, ale data se nesdílí | Konfigurace není vyplněná, běží lokální režim. Zkontroluj `projectId` v `src/lib/firebase.config.ts`. |
| V kvízu chybí volba „Telefony hráčů" | Sdílená databáze není dostupná. Kvíz půjde promítat, telefony se nepřipojí. |
| Kvíz hlásí, že balíčky nejdou načíst | Nejsou publikovaná aktuální pravidla pro veřejné čtení `quizPacks`, krok 1.3. |
| Hráči se nepřipojí, ale kód na plátně je | Nejsou publikovaná pravidla pro `quiz`, krok 1.3. |
| Všichni hráči mají v čekárně stejné zvíře | Pravidla jsou starší než aplikace a pole `avatar` odmítají, telefon se proto připojí bez něj. Publikuj pravidla znovu, krok 1.3. |

Aplikace je schválně stavěná tak, že když se k Firebase nedostane,
spadne do lokálního režimu a **hraje se dál**. Deset minut před školením
je to lepší než chybová hláška.

## 2. GitHub Pages

1. Založ repozitář, například `uniqa-playground`, a nahraj do něj projekt:

```bash
git add -A
git commit -m "Mučírna: hra Pojišťuj!"
git branch -M main
git remote add origin https://github.com/<ucet>/uniqa-playground.git
git push -u origin main
```

2. V repozitáři **Settings → Pages → Build and deployment → Source**
   přepni na **GitHub Actions**.
3. Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   se pustí sám při každém pushi do `main`. Podadresář si dopočítá z názvu
   repozitáře, takže na tom není co nastavovat.
4. Adresa bude `https://<ucet>.github.io/<nazev-repozitare>/`.

Když se repozitář jmenuje jinak než `uniqa-playground`, není potřeba nic
měnit: sestavení na CI si název dosadí samo. Lokální `npm run build` používá
výchozí `/uniqa-playground/`, případně `VITE_BASE=/jiny-nazev/ npm run build`.

---

## 3. Kontrola po nasazení

- [ ] Hra se otevře a deska se vejde na obrazovku.
- [ ] Přímé otevření `/<repozitar>/admin` funguje i po tvrdém obnovení.
- [ ] Heslo do správy je nastavené.
- [ ] Nový balíček se objeví i v jiném prohlížeči, tedy Firestore opravdu jede.
- [ ] Aplikace jde v prohlížeči nainstalovat a po vypnutí sítě naběhne.

## 4. Před ostrým školením

- Otevři hru na tom notebooku a s tím projektorem, na kterém poběží.
- Zapni ji jednou **s připojením**, aby se stáhla do prohlížeče. Pak už
  funguje i bez sítě.
- V nastavení zvětši písmo podle velikosti místnosti.
- Zkontroluj zvuk, nebo ho vypni.
