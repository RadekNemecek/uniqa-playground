# Nasazení

Dvě části, každá zabere pár minut: **Firebase** (kde žijí otázky) a
**GitHub Pages** (kde běží aplikace). Jde je udělat v libovolném pořadí,
aplikace funguje i bez Firebase, jen se otázky neukládají do cloudu.

---

## 1. Firebase Firestore

### 1.1 Založení projektu

1. Otevři [console.firebase.google.com](https://console.firebase.google.com)
   a přihlas se Google účtem, který má projekt vlastnit.
2. **Vytvořit projekt** → název například `playground`. Google Analytics
   klidně vypni, k ničemu tu není.
3. Vlevo **Build → Firestore Database → Create database**.
   Vyber **production mode** a region **eur3 (europe-west)**.
4. Vlevo **Build → Authentication → Get started**, karta
   **Sign-in method**, zapni **Anonymous**.
   Bez tohohle kroku se aplikace k databázi nedostane.

### 1.2 Konfigurace do repozitáře

1. Ozubené kolo vedle *Project Overview* → **Project settings**.
2. Dole v **Your apps** klikni na ikonu webu `</>`, aplikaci pojmenuj
   a **zaregistruj**. Hosting nepotřebuješ.
3. Google ukáže objekt `firebaseConfig`. Šest hodnot z něj přepiš do
   [`src/lib/firebase.config.ts`](src/lib/firebase.config.ts).

Tyhle hodnoty jsou veřejné, tak je Firebase navržený. Klíč jen říká,
ke kterému projektu se klient hlásí. Kdo smí co číst a zapisovat,
rozhodují pravidla na straně Google.

### 1.3 Pravidla

V konzoli **Firestore Database → Rules** vlož celý obsah souboru
[`firestore.rules`](firestore.rules) a dej **Publish**.

Co pravidla dělají:

- balíčky otázek smí **číst kdokoli**, kdo má odkaz na hru,
- **zapisovat** smí jen ten, kdo prokázal znalost hesla do správy,
- otisk hesla v `config/admin` **nesmí přečíst nikdo**, ani přihlášený
  klient. Pravidla si ho přečíst umí, a na tom je ochrana postavená.

### 1.4 První heslo

Otevři nasazenou aplikaci, jdi do **Otázky** a nastav heslo. První nastavení
je otevřené záměrně, proto ho udělej hned po nasazení. Od té chvíle jde heslo
změnit jen z odemčené správy.

Heslo si zapiš. Obnovit ho lze pouze smazáním dokumentu `config/admin`
ve Firebase konzoli.

---

## 2. GitHub Pages

1. Založ repozitář, například `uniqa-playground`, a nahraj do něj projekt:

```bash
git add -A
git commit -m "Playground: hra Riskuj"
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
