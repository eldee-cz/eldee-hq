# eldee HQ — kontext projektu

Sdílený kontext pro tým (Lukáš Doležal + Lukáš Hledík). Udržuje Jarvis (Claude Code) — na konci sezení sem zapisuje, co se udělalo, aby na tom mohli pracovat oba.

POZOR: eldee-hq je VEREJNE repo. Zadne finance, smlouvy, hesla, sura cisla. Jen "jak nastroje funguji / co pribilo".

---

## Zive artefakty (stranka po strance)

### Nastěnka (`index.html`)
Dashboard projektu. Vykresluje karty, ukoly, milniky a odkazy z `data/stav.json`. Nikdy ji rucne nepsat — vse jde pres stav.json.

### Finance (`kalkulacka.html`) — dlazdice "Finance"
Vse o penezich. Nic o zbozi.

Co umi:
1. Produkty, ceny, prvky, mix — navlek, ponozka, nizka/vysoka stulpna, set. Marze/ks se pocita z ceny, COGS, brany (2,5 % + 5 Kc) a marketingu.
2. Prvky / priplatky — Grip, Kapsa, Dira. U produktu se zapinaji klicimi stitky, promitaji se do ceny i COGS a do celkovych vysledku.
3. MOQ cenik — u kazdeho produktu mnozstevni cenik (mnozstvi → cena/ks). Vetsi MOQ = nizsi cena/ks = vyssi marze.
4. Cile + naseptavac — cil cisteho/mes, cilova marze/ks, cilova zasoba (mesice). Zelene rady, jak se k cili dostat.
5. Nejblizsi udalosti — 5 rucnich terminu (DPH, danove priznani…). Barevne podle dni do terminu.

### Sklad (`sklad.html`) — dlazdice "Sklad"
Vse o zbozi. Nic o penezich. Data jen v localStorage prohlizece (klic `eldeeData`).

Co umi:
1. Prijem zbozi (faktury) — kazdy radek = jedna prijata varianta: Produkt, Barva, Provedeni, Velikost, mnozstvi, cena bez DPH/ks, splatnost. Cena s DPH a celkova castka se pocitaji samy.
2. Sklad podle variant se SKU kody — format SKU: PRODUKT-BARVA-PRVKY-VEL, napr. `NIZ-BIL-D-3942`. SKU sedi 1:1 se sklademobjednavky.html (sdileny ciselnik variant).
3. KPI prouzek — kusu skladem, pocet variant, hodnota skladu, celkem k zaplaceni.
4. Splatnosti faktur — hlida co a kdy je potreba zaplatit; odznak na tlacitku kdyz je neco nezaplacene.
5. Export pro Shoptet (CSV) — SKU, nazev, barva, provedeni, velikost, skladem.
6. Zaloha / Nactit soubor — data se ukladaji v prohlizeci (localStorage). Zaloha = JSON soubor → ulozit rucne do eldee-business (privatni repo). Takhle sdili Luky s Hledikerm.

**Novy od 2026-06-28 (Prodej/vydej + Shoptet import):**
- Zalozka Prodej/vydej: rucni vydej na vyjimky (prodej/vzorek/darek/reklamace/ztrata), duvod u kazdeho radku, cena jen u prodeje, blok precerpani (nikdy do minusu), doklady VY + cislo skladove karty + SKU.
- Zalozka Historie prodejů.
- Import objednavek ze Shoptetu ze souboru CSV — hlida duplicity pres cislo objednavky.
- Produkt "Bundle" prejmenovan na "Set".

**Novy od 2026-06-29 (reklamacni sklad):**
- Read-only sekce "Na reklamaci" — prehled kusu v reklamacnim skladu (presunute prevodkou z reklamace.html).
- Pri ukladani dat zachovava `claimStock` v `eldeeData` — neplise reklamacni zbozi s prodejnim.

### Objednavky (`objednavky.html`) — dlazdice "Objednavky" — NOVA od 2026-06-28
Sprava dodavatelu, vyrobnich sablon a objednavek. Data jen v localStorage prohlizece (klic `eldeeData`).

**Faze 1 — Dodavatele + sablony + terminy:**
- Kartoteka dodavatelu: vic kontaktu/osob na dodavatele, telefon po trojicich, dovolene pres kalendar s "opakovat kazdy rok".
- Vyrobni sablony: kroky pleteni → doprava → vysivka, sjednoceny ciselnik kroku, pracovni i kalendarni dny.
- Automaticke statni svatky CZ/SK/PL/DE vcetne Velikonoc a jejich nazvu — vypocet offline, bez API.
- Kalkulacka terminu obema smery (datum zadani → datum dodani / zpetne planovani).

**Krok A — Objednavky jako doklad:**
- Objednavka ma stavy: koncept → objednano → prijato.
- Zbozi na ceste — ETA z vyrobni sablony.
- Prijeti objednavky naskladni zbozi automaticky do skladu (prijemka) a premiti se do Financi.
- Zalozka Ceniky: mnozstevni ceniky dodavatelu per varianta → cena/ks v objednavce naskoci sama dle mnozstvi.

**Krok B — Mozek (hladiny zasob + navrh objednavky):**
- Zalozka Hladiny: min zasoba + cilova zasoba per varianta (SKU).
- Sekce "Doporucujeme objednat": navrhne co a kolik objednat — bere v uvahu stav skladu, zbozi na ceste, rychlost prodeje a lead time z vyrobni sablony. Cenikovy tip na vyhodnejsi pasmo.
- Upozorneni na podhladinove varianty primo ve formulari objednavky.
- Tlacitko "Vytvorit koncept z navrhu" — jeden klik ze sekce doporuceni rovnou do konceptu objednavky.

### Reklamace & vraceni (`reklamace.html`) — dlazdice "Reklamace & vraceni" — NOVA od 2026-06-29

Sprava reklamaci od zakaznika, reklamaci u dodavatele a vraceni do 14 dni. Data jen v localStorage prohlizece (klic `eldeeData`).

Co umi:
1. Tri evidence s auto-cislovanim: RZ (reklamace od zakaznika), RD (reklamace u dodavatele), VR (vraceni do 14 dni).
2. Hlidani lhut — kolik dni zbyvat, barevne zvyrazneni po terminu.
3. Narok automaticky dle typu: 24 mesicu reklamace, 14 dni pro odstoupeni od smlouvy.
4. Navrzene × provedene reseni, rychla zmena stavu primo v radku.
5. Otevrene zaznamy oddelene od uzavrenych (sbalene pod poctem).
6. Z RZ se na klik zalozi navazana RD — propojeni dokladu.
7. Editovatelne lhuty + cislelnik zpusobu vyrieseni, filtr/hledani, zaloha export/import.
8. 20 strojovych testu jadra (`tests/reklamace-core.test.js`).

**Jadro — dvoukeblikov sklad:**
- Prodejni sklad (ten jde na Shoptet) + reklamacni sklad (u nas / u dodavatele).
- Vadny kus se presouva prevodkou (vzdy potvrzenou tlacitkem) → Shoptet ho neuvidi → nepreprodá se.
- Sklad (`sklad.html`) dostal read-only sekci "Na reklamaci".

*V2 (odlozeno): prehled kvality — % uznavanych reklamaci, nejcastejsi vady.*

### Mereni nohou (`mereni-nohou.html`) — dlazdice "Mereni nohou" — NOVA od 2026-07-07

Zivy formular pro velikostni studii. Luky meri detske nohy v terenu primo do mobilu; z dat appka pocita idealni vysku stulpny a pasmo pro diry na lytku, zvlast pro kazdou velikost S/M/L/XL.

Co umi:
1. Jedno dite = jeden zaznam, jedna noha, vsechny vysky od podlahy. Kolonky: pohlavi, vek, vyska ditete, cislo boty (→ auto S/M/L/XL), vyska zacatku stehenniho svalu (= vrsek stulpny), vyska horni a spodni hrany lytkoveho svalu, poznamka.
2. Ctyri obrazovky: Nove mereni / Seznam (uprava, smazani) / Vysledky (prumer + median + min-max po velikostech, celkovy prehled) / Zaloha (export/import se sloucenim podle id).
3. Cisté jadro `mereni-core.js` + 23 testu (`tests/mereni-core.test.js`). Spec a plan v `docs/superpowers/`.

Data jen v prohlizeci (localStorage `eldee-mereni-v1`), prenos pres Zalohu. **Jmena se nesbiraji.** Do tohoto (verejneho) repa nejdou zadna namerena data — jen kod nastroje.

### Ostatni stranky
- `kluby-vyhledavac.html` — hledac fotbalovych klubu (+ `data/kluby-data.json`)
- `kniha.html` — studijni material (kap. 8 knihy)
- `pruzkum-cilovky.html` — pruzkum cilove skupiny
- `maskot-editor/` — editor maskota (cisteni krabice, klonovani)
- `eshop-nahled/` — mockup e-shopu (homepage, produkt, kosik, checkout, dekkovacka)
- `dotazniky.html` — dotazniky
- `brand-assety.html` — brand assety
- `socialni-site.html` a `social-*.html` — rozcestniky socialnich siti + obsah

---

## Provoz / workflow

- Pri startu eldee Jarvis otevere GitHub stranku eldee-hq v prohlizeci (prehled stavu).
- Na konci sezeni agent `eldee-hq-keeper` aktualizuje tenhle soubor, hlida citliva data a navrhne commit; push az po ohlaseni Lukymu.
- Deploy eldee-hq: staticky web (Vercel), push = web nazivo do minuty.
- Novy ukol / splneny ukol / milnik: vzdy do `data/stav.json`. Po editaci stav.json VZDY over JSON: `node -e "require('./data/stav.json')"`.
- Specy a plany jsou v `docs/superpowers/` — specs/ jsou design dokumenty, plans/ jsou implementacni plany.

---

## Sdileny localStorage

Vsechny nastroje (sklad.html, kalkulacka.html, objednavky.html) sdili stejny klic `eldeeData` na stejnem originu → data jsou sdilena. Citliva data (finance, objednavky, sklad) existuji JEN v prohlizeci — nikdy nejdou do gitu.

Sdileni s Hledikerm: tlacitko Zaloha (JSON soubor) → prenest do eldee-business (privatni repo) → Hledik nacte. Plne cloud sdileni az se rozjede realny prodej.

---

## Aktualni stav / posledni zmeny

### 2026-07-07
- **Nova dlazdice Mereni nohou** (mereni-nohou.html) — viz popis sekce vyse. Zive na HQ, ukol `mereni-nohou` v stav.json odskrtnuty jako hotovo + milnik v timeline.

### 2026-06-29
- **Reklamace & vraceni V1** (reklamace.html) — nova dlazdice, plne funkci, 20 testu jadra. Viz popis sekce vyse.
- **Sklad** dostal read-only sekci "Na reklamaci" (zbozi presunute prevodkou) + oprava ukladani `claimStock`.
- **Objednavky Faze 3/4 opusteny** — velka prace za maly prinos; davaji smysl az s realnym prodejem. Zustava ve fronte ukolu (nemazat).
- Milnik zaznamenan v `data/stav.json`.

### 2026-06-28
- **Sklad** rozsiren o Prodej/vydej, Historii prodejů a Shoptet CSV import (viz sekce vyse).
- **Objednavky** (objednavky.html) — nova dlazdice, hotova Faze 1 + Krok A + Krok B (mozek). Kompletni celek.
- Novy ukoly splneny: objednavky-faze1, objednavky-faze2A, objednavky-faze2B — odskrtnute v stav.json.
- Web live na eldee-hq.vercel.app.

### 2026-06-26
- Sklad i Finance kokpit LIVE. Data zatim cvicna — pred ostrym provozem se sklad vynuluje.
- Socialni site: rozcestnik + individual stranky.

### 2026-06-24
- Sklad (sklad.html) zalozen: prijem zbozi, SKU, splatnosti faktur, Shoptet CSV export.
- Finance (kalkulacka.html) vycistena: presun zbozi do skladu.

---

## Rozpracovane veci / co dal

- **Reklamace V2** — prehled kvality (% uznavanych, nejcastejsi vady). Odlozeno, bude davat smysl az s daty.
- **Objednavky Faze 3/4** — ve fronte, ceka na realny prodej (nemazat).
- **Shoptet live API** — online prenos skladu, nenabizet varianty ktere nejsou skladem. Potrebuje Shoptet pristupy (zatim jen CSV export/import).
- **Propojeni s rodinnym kalendarem** — pravidelne terminy (DPH, danove priznani, splatnosti faktur) automaticky do kalendare.
- **Cloud sharing / heslovani skladu** — az se rozjede realny prodej.
- **Drop 001 launch** — launch = jen diry, kapsa na chranice az pozdeji.

### Otevrene k rozhodnuti
- **Automatika WIP push** — eldee automatika pushuje prubeznne na zive HQ i rozdelane veci. Zvazte, jestli to takto chcete, nebo push az po dokonceni celku.
