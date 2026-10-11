# Nasazení

Všechno běží ve Firebase projektu `uniqa-playground`: **Firestore**, kde
žijí otázky, a **Hosting**, odkud se aplikace načítá na adrese
**https://kamucirna.cz/**. Aplikace funguje i bez Firestore, jen se otázky
neukládají do cloudu.

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

### 1.2 Zapnout přihlašování

Dva způsoby, oba jsou potřeba. Telefon hráče se přihlašuje **anonymně**,
hráč o tom neví, ale pravidla podle toho poznají jeho kartu ve hře.
Člen týmu se přihlašuje **e-mailem a heslem**, účet mu vznikne
z pozvánky, tedy z přihlašovacího odkazu v mailu.

1. V levém menu **Build → Authentication → Get started**.
2. Záložka **Sign-in method**, v seznamu **Native providers**:
   - **Anonymous**: **Enable** a **Save**,
   - **Email/Password**: zapnout **Email/Password** i **Email link
     (passwordless sign-in)** a **Save**.
3. **Authentication → Settings → Authorized domains**: musí tam být
   `kamucirna.cz`. Bez toho se pozvánka ani obnova hesla neodešle.
4. **Project settings → General → Public-facing name**: `Mučírna`. Tohle
   jméno je v mailech s pozvánkou a obnovou hesla místo `uniqa-playground`.

Projekt musí být na tarifu **Blaze**. Na bezplatném Sparku pošle Firebase
jen pět přihlašovacích odkazů denně na celý projekt, a pozvánka je
přihlašovací odkaz. Bezplatné kvóty Firestore i Hostingu na Blaze platí
dál, při tomhle provozu vychází účet na nulu. Nastav upozornění na
rozpočet (**Google Cloud → Billing → Budgets & alerts**), třeba na 50 Kč.

Ověření: u *Anonymous* i *Email/Password* je stav **Enabled**.

### 1.3 Vložit pravidla

1. **Build → Firestore Database**, záložka **Rules**.
2. Smaž celý obsah editoru a vlož místo něj **celý** soubor
   [`firestore.rules`](firestore.rules) z tohohle repozitáře.
3. **Publish**. Nahoře se musí objevit potvrzení, že jsou pravidla nasazená.

Pravidla se občas změní spolu s aplikací. Ručně se vkládají jen
napoprvé, potom je nasadí `firebase deploy` spolu s aplikací (viz
kapitola 2). Ruční publikování se totiž dvakrát zapomnělo a server pak
nový zápis odmítal. Naposledy s **výsledky desky Pojišťuj!** v kolekci
`pojistujRuns`: bez nových pravidel se odehraná hra neuloží a záložka
Výsledky ji nenačte. Předtím to byl **Výslech** (`vyslechForms`, `vyslech`
s podkolekcí `responses` a `vyslechReports`), bez jehož pravidel se sběr
neotevřel, a ještě dřív obrázky k otázkám kvízu v kolekci `quizImages`. Samotná pravidla bez aplikace
nasadí `firebase deploy --only firestore:rules`.

Co pravidla dělají:

- všechno, co tým připravil, leží pod **`spaces/{prostor}`**: balíčky
  desky Pojišťuj! (`packs`) i kvízu (`quizPacks`), obrázky k otázkám
  (`quizImages`), sady Výslechu (`vyslechForms`) a výsledky
  (`pojistujRuns`, `quizReports`, `vyslechReports`). Čte a mění je **jen člen týmu**
  přihlášený e-mailem, který je ověřený,
- **členové** jsou v `spaces/{prostor}/members/{e-mail}` s rolí `admin`,
  nebo `editor`. Zvát, měnit role a odebírat smí jen admin, sám sebe ale
  neodebere ani nesesadí. Člen si sám zapíše jen to, že pozvánku přijal,
- **obrázek** je vlastní dokument s daty v base64, pravidlo navíc hlídá
  strop, aby se do databáze nedostalo nic, co by se přes rozhraní nevešlo,
- **výsledky** se po zapsání nedají změnit, jen smazat,
- běžící hru kvízu si přečte každý, kdo zná pětiznakový kód, ale není
  v ní znění otázky ani správná možnost, dokud ji moderátorka neodhalí.
  Založit ji smí jen člen prostoru, ze kterého jsou otázky,
- hráč smí zapsat **jednu** odpověď na otázku a jen dokud otázka běží.
  Pozdní odpověď odmítne server, ne prohlížeč moderátorky,
- běžící sběr **Výslechu** si přečte každý, kdo zná kód, protože telefon
  musí otázky zobrazit. Odpovědi v něm nejsou. Otevřít ho smí jen člen.
  Každý telefon smí zapsat jen svůj dotazník a jen dokud sběr běží;
  druhé odeslání přepíše první, takže se nikdo nezapočítá dvakrát,
- všechno ostatní je zavřené, i staré kolekce z doby hesla do správy.

Pravidla mají testy, které běží v emulátoru:

```bash
npm run test:rules
```

Konzole u řádků s `get()` a `exists()` může hlásit varování o počtu čtení.
Je to v pořádku, tyhle dotazy se dělají jen při zápisu.

### 1.4 Zaregistrovat webovou aplikaci a opsat konfiguraci

1. Nahoře vlevo ozubené kolo vedle **Project Overview** → **Project settings**.
2. Záložka **General**, sjeď dolů na **Your apps**.
3. Klikni na ikonu webu **`</>`**.
4. **App nickname** třeba `playground`.
   **Firebase Hosting** zaškrtávat nemusíš, nastavuje se v kapitole 2.
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

### 1.5 Založit tým a prvního admina

Prostor týmu a první admin se zakládají skriptem, v aplikaci to nejde:
admina musí někdo pozvat a na začátku není kdo. Skript pracuje s tvým
přihlášením v `gcloud` (`gcloud auth login`). Bez `--apply` jen vypíše,
co by udělal.

```bash
npm run migrate -- --admin tvuj@email.cz --apply
npm run migrate -- --admin tvuj@email.cz --invite
```

První příkaz založí prostor `spaces/uniqa` a zapíše tě jako admina.
Druhý ti pošle pozvánku: otevři odkaz z mailu, nastav si heslo a jsi
uvnitř. Další členy už zveš z aplikace, **nabídka → Tým → Pozvat**.

Ověření v konzoli, **Firestore Database → Data**:

| kolekce | co v ní je |
|---|---|
| `spaces/uniqa` | název týmu |
| `spaces/uniqa/members` | jeden dokument na člena, id je e-mail |
| `spaces/uniqa/packs`, `quizPacks`, `quizImages` | otázky a obrázky |
| `spaces/uniqa/pojistujRuns`, `quizReports`, `vyslechForms`, `vyslechReports` | výsledky a sady Výslechu |
| `quiz`, `vyslech` | běžící hry a sběry, mizí po ukončení |

Poslední zkouška: přihlas se v jiném prohlížeči. Balíčky se musí objevit,
aniž bys tam cokoli dělal. Tím je ověřené, že data žijí v cloudu a kolegové
je uvidí.

### 1.6 Úklid po kvízu a Výslechu

Každá odehraná hra kvízu založí dokument v kolekci `quiz` a pod ním
podkolekce `players` a `answers`. Tlačítko **Ukončit a uklidit** na konci
hry je všechny smaže. Výslech totéž: sběr založí dokument v `vyslech`
s podkolekcí `responses` a ukončení sběru je po uložení výsledků smaže.

Pojistka pro případ, že školitelka jen zavřela notebook, je **TTL
politika**: Firestore sám smaže dokument, jehož `expiresAt` je v minulosti.
Session žije osm hodin, takže zapomenutá hra zmizí nejpozději druhý den.
Platí pro pět skupin kolekcí, všechny nad polem `expiresAt`:

| skupina kolekcí | co v ní je |
|---|---|
| `quiz` | běžící hra kvízu |
| `players` | hráči pod ní |
| `answers` | odpovědi pod ní |
| `vyslech` | běžící sběr Výslechu |
| `responses` | dotazníky pod ním |

Všech pět je potřeba. **Smazání dokumentu ve Firestore nemaže jeho
podkolekce**, takže bez politiky nad `players` a `answers` by po hrách
zůstávaly osiřelé dokumenty, které se v konzoli ani neukážou.

Politiky jsou zapsané ve [`firestore.indexes.json`](firestore.indexes.json)
(`"ttl": true`) a nasazuje je `firebase deploy`. Ruční nastavení v konzoli
by příští nasazení nevidělo. Stav ukazuje **Firestore Database →
Time-to-live (TTL)**, nebo:

```bash
gcloud firestore fields ttls list --project=uniqa-playground
```

Po nasazení jsou chvíli ve stavu `CREATING`, pak `ACTIVE`. TTL vyžaduje
tarif Blaze, zapnuté jsou od října 2026. Mazání neběží na vteřinu přesně,
Google uvádí obvykle do 24 hodin po vypršení.

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
2. **Automaticky.** Přidej do `firestore.indexes.json` TTL politiku
   i nad `quizReports` nad polem `expiresAt` a do ukládaného dokumentu
   to pole doplň. Firestore pak záznam smaže sám a nikdo na to nemusí
   myslet.

Kdo se ptá, co se s jeho přezdívkou stane, má dostat tuhle odpověď:
zůstane ve vyhodnocení školení, nikam se neposílá a po roce se maže.

Totéž platí pro **výsledky Výslechu** v kolekci `vyslechReports`. Jsou
bez identit, ale volná odpověď může obsahovat jméno, třeba lektora nebo
kolegy. Doba uchování je stejná, rok, a maže se na `/vyslech/vysledky`.

Session platí osm hodin. Po vypršení ji smí uklidit kdokoli, takže
zabraný kód se sám uvolní i tehdy, když se původní počítač už nikdy
nepřipojí.

### 1.7 Když to nejede

| co vidíš | co s tím |
|---|---|
| `auth/configuration-not-found` | Není zapnuté přihlašování, krok 1.2. |
| „Přihlašování e-mailem není ve Firebase zapnuté" | Chybí **Email/Password** nebo **Email link**, krok 1.2. |
| „Tahle adresa aplikace není ve Firebase povolená" | Doména chybí v **Authorized domains**, krok 1.2. |
| „Firebase dnes už další maily nepošle" | Projekt je na Sparku a vyčerpal pět odkazů denně. Přepni na Blaze, krok 1.2. |
| Pozvánka nepřišla | Podívej se do nevyžádané pošty. Pak v **Tým** u člena **Poslat pozvánku znovu**. |
| „Pozvánka už neplatí" | Odkaz propadl nebo už byl použitý. Pošli ji znovu z **Tým**. |
| „Sem zatím nemáš přístup" | Přihlášený e-mail v týmu není. Admin ho pozve, nebo se člověk přihlásí adresou, na kterou pozvánka přišla. |
| `Missing or insufficient permissions` při čtení | Nejsou nasazená pravidla, nebo přihlášený nemá členství. |
| Uložení otázky se nepovede | Odebrané členství, nebo nejsou nasazená pravidla. |
| Aplikace jede, ale data se nesdílí | Konfigurace není vyplněná, běží lokální režim. Zkontroluj `projectId` v `src/lib/firebase.config.ts`. |
| V kvízu chybí volba „Telefony hráčů" | Sdílená databáze není dostupná. Kvíz půjde promítat, telefony se nepřipojí. |
| Kvíz hlásí, že balíčky nejdou načíst | Nejsou nasazená aktuální pravidla, krok 1.3, nebo bylo odebrané členství. |
| Hráči se nepřipojí, ale kód na plátně je | Nejsou publikovaná pravidla pro `quiz`, krok 1.3. |
| Všichni hráči mají v čekárně stejné zvíře | Pravidla jsou starší než aplikace a pole `avatar` odmítají, telefon se proto připojí bez něj. Publikuj pravidla znovu, krok 1.3. |

Aplikace je schválně stavěná tak, že když se k Firebase nedostane,
spadne do lokálního režimu a **hraje se dál**. Deset minut před školením
je to lepší než chybová hláška.

## 2. Firebase Hosting a doména

Nasazuje se ručně z adresáře projektu. GitHub slouží jen jako repozitář.

```bash
firebase deploy
```

Příkaz napřed spustí `npm run build` (je to `predeploy` ve
[`firebase.json`](firebase.json)), takže se nikdy nenasadí stará složka
`dist`. Pak nasadí **pravidla Firestore i aplikaci najednou**. Když
spadne kontrola typů, nenasadí se nic.

Jen aplikace, nebo jen pravidla:

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

### 2.1 Náhled před nasazením

Větev se dá vyzkoušet na vlastní adrese, aniž by se dotkla
`kamucirna.cz`. Příkaz vypíše adresu na `web.app`, platí týden.

```bash
npm run build
firebase hosting:channel:deploy nahled --expires 7d
```

Náhled **jede nad ostrou databází a ostrými pravidly**: co v něm uložíš,
uvidí i kolegyně, a pravidla se s náhledem nenasazují.

### 2.2 Doména

1. Ve Firebase konzoli **Hosting → Add custom domain**, zadej
   `kamucirna.cz`. Pak ještě jednou `www.kamucirna.cz` a nastav ji jako
   přesměrování na `kamucirna.cz`.
2. Konzole vypíše DNS záznamy. Zapiš je u registrátora. Ověření
   a certifikát trvají od minut po několik hodin, konzole ukazuje stav.
3. **Authentication → Settings → Authorized domains**, přidej
   `kamucirna.cz`. Anonymní přihlášení to nepotřebuje, přihlašování
   e-mailem ano.

### 2.3 Mezipaměť a přímé adresy

[`firebase.json`](firebase.json) posílá každou adresu, pro kterou
neexistuje soubor, na `index.html`. Přímé otevření `/admin` nebo `/k/KOD`
z QR kódu tak vrátí aplikaci se stavem 200.

Soubory v `assets/` mají v názvu otisk obsahu, takže se v prohlížeči
drží rok a nemění se. Všechno ostatní má `no-cache`: prohlížeč se pokaždé
zeptá, jestli se soubor nezměnil. Hlavně `sw.js` se nesmí držet
v mezipaměti, jinak by telefony a notebooky zůstaly na staré verzi.

Lokálně se hosting dá vyzkoušet takhle:

```bash
npm run build
firebase emulators:start --only hosting
```

V emulátoru se ale nezaregistroval service worker, i když se `sw.js`
dal stáhnout. Proč, zjištěno není. Na `uniqa-playground.web.app` se
registruje a aplikaci si uloží, takže offline režim se ověřuje tam.

### 2.4 Stará adresa na GitHub Pages

Aplikace dřív běžela na `radeknemecek.github.io/uniqa-playground/`. Až
pojede `kamucirna.cz`, spusť v GitHubu **Actions → Rozlučka s GitHub
Pages → Run workflow** ([`pages-farewell.yml`](.github/workflows/pages-farewell.yml)).
Na starou adresu nasadí přesměrování na stejnou cestu na nové doméně
a service workera, který starou aplikaci z prohlížečů smaže. Bez něj by
se každý, kdo ji měl otevřenou, dál díval na starou verzi z mezipaměti
a o přesměrování by se nedozvěděl.

Je to poslední věc, kterou GitHub nasazuje. Nech ji běžet pár týdnů,
dokud všichni nepřejdou na novou adresu. Pak v repozitáři **Settings →
Pages** stránky vypni a smaž `pages-farewell.yml` i složku
`pages-farewell/`.

Co se nepřenese: všechno, co je uložené v prohlížeči, patří k adrese.
Na nové doméně proto bude prázdný archiv odehraných her desky Pojišťuj!,
je potřeba se znovu přihlásit a nastavení písma a zvuku bude výchozí.
Balíčky, obrázky a výsledky kvízu i Výslechu jsou ve Firestore
a zůstanou.

---

## 3. Kontrola po nasazení

- [ ] Hra se otevře a deska se vejde na obrazovku.
- [ ] Přímé otevření `https://kamucirna.cz/admin` funguje i po tvrdém obnovení.
- [ ] Admin se přihlásí a v **Tým** vidí sám sebe.
- [ ] Pozvánka kolegyni dorazí a ona si nastaví heslo.
- [ ] V anonymním okně vede **Otázky** na přihlášení, ne k balíčkům.
- [ ] Nový balíček se objeví i v jiném prohlížeči, tedy Firestore opravdu jede.
- [ ] Aplikace jde v prohlížeči nainstalovat a po vypnutí sítě naběhne.

## 4. Před ostrým školením

- Otevři hru na tom notebooku a s tím projektorem, na kterém poběží.
- Zapni ji jednou **s připojením**, aby se stáhla do prohlížeče. Pak už
  funguje i bez sítě.
- V nastavení zvětši písmo podle velikosti místnosti.
- Zkontroluj zvuk, nebo ho vypni.

## 5. Přechod z hesla na přihlášení

Jednorázově, říjen 2026. Do té doby otevíralo správu jedno heslo
a balíčky ležely v kolekcích nahoře v databázi. Na pořadí záleží:
nová pravidla zavřou staré kolekce, takže data musí být v prostoru dřív,
než se pravidla nasadí, a pozvánka může odejít až potom, co je venku
stránka `/pozvanka`.

1. Projekt na **Blaze** a nastavení přihlašování, krok 1.2.
2. Kopie dat do prostoru. Nanečisto, pak doopravdy. Stará aplikace mezitím
   jede dál nad starými kolekcemi, kopie jí nevadí.
   ```bash
   npm run migrate -- --admin tvuj@email.cz
   npm run migrate -- --admin tvuj@email.cz --apply
   ```
3. Pravidla i aplikace najednou, z `main`:
   ```bash
   firebase deploy
   ```
   Od téhle chvíle se do dat dostane jen člen. Kdo má otevřenou starou
   verzi, uvidí po obnovení stránky přihlášení.
4. Pozvánka adminovi. Otevři odkaz z mailu a nastav si heslo.
   ```bash
   npm run migrate -- --admin tvuj@email.cz --invite
   ```
5. Projdi kontrolu z kapitoly 3: balíčky obou her, výsledky, Výslech
   a kvíz s telefonem.
6. Úklid starých kolekcí. Skript odmítne mazat, dokud v prostoru něco
   chybí.
   ```bash
   npm run migrate -- --cleanup
   npm run migrate -- --cleanup --apply
   ```
7. Pozvi kolegyně z **nabídka → Tým → Pozvat**.
