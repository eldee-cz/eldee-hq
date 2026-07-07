# Dlaždice 📏 Měření nohou (velikostní studie) — design

**Datum:** 2026-07-07
**Autor:** Doležal (+ Jarvis)
**Stav:** schváleno, čeká plán

## Cíl

Živý formulář v HQ pro sběr měření dětských nohou v terénu. Luky měří děti přímo na mobilu
a rovnou zapisuje do formuláře (žádné dvojité přepisování z papíru). Z nasbíraných dat appka
spočítá **ideální výšku štulpny** a **pásmo pro díry na lýtku** — zvlášť pro každou velikost
(S/M/L/XL). Přesné rozmístění dvou děr po lýtku si Luky dopočítá sám podle velikosti díry.

## Kontext / rozhodnutí z brainstormingu

- **Nulový bod všech výšek = podlaha.** Dítě stojí, každý bod se měří jako výška nad zemí (cm).
- **Štulpna se počítá od podlahy nahoru.** Kotník se neměří (vědomé zjednodušení — Luky).
- **Horní okraj štulpny = začátek stehenního svalu** (nad kolenem).
  Pořadí bodů zdola nahoru: spodní hrana lýtka → horní hrana lýtka → koleno → začátek stehenního svalu.
- **Jedna noha na dítě** (ne L/P).
- **Díry:** na lýtku budou **dvě díry rozložené přes sval**. Appka spočítá jen ideální **pásmo lýtka**
  (spodek, vršek, střed, délka svalu); rozmístění dvou děr podle jejich velikosti řeší Luky ručně
  → appka NEřeší velikost/průměr díry.
- **Výsledky po velikostech** S/M/L/XL (podle čísla boty), protože štulpny se vyrábí v těchto velikostech.
  Jeden globální průměr přes všechny děti by nesedl nikomu. Navíc celkový přehled nad rozpadem.
- **Statistika:** ukázat **průměr i medián** + počet dětí + min–max (rozptyl). Luky se rozhodne sám.
  Medián je odolnější vůči jednomu špatně změřenému dítěti.

## Umístění a data

- **Nový soubor:** `mereni-nohou.html` (samostatná dlaždice, stejný styl jako sklad/reklamace).
- **Data jen v prohlížeči** (localStorage), klíč `eldee-mereni-v1`. Do veřejného repa nikdy nejdou.
  Přenos mezi zařízeními přes **Zálohu** (export/import JSON) — stejný vzor jako ostatní dlaždice.
  (Data jsou neškodná, bez jmen, ale pravidlo držíme stejné.)
- Dlaždice přidána na nástěnku HQ (`index.html` se generuje z dat — přidat i do přehledu dlaždic tam,
  kde se dlaždice registrují) + úkol/milník do `data/stav.json`.
- Mobile-first: velké tap targety (min 44 px), číselná klávesnice (`inputmode="decimal"`),
  font ≥16 px u inputů (proti iOS zoomu).

## Datový model

Jeden záznam = jedno dítě (jedna noha):

```
{
  id: string,              // unikátní (časové razítko + čítač)
  pohlavi: "kluk"|"holka"|"", 
  vek: number|null,        // roky
  vyskaTela: number|null,  // cm, výška dítěte
  cisloBoty: number|null,  // velikost nohy → mapuje na S/M/L/XL
  stehno: number|null,     // výška začátku stehenního svalu (cm od podlahy) = vršek štulpny
  lytkoHorni: number|null, // výška horní hrany lýtkového svalu (cm)
  lytkoSpodni: number|null,// výška spodní hrany lýtkového svalu (cm)
  poznamka: string,
  vytvoreno: string        // datum
}
```

Uloženo jako `{ zaznamy: [...] }` pod klíčem `eldee-mereni-v1`.

## Mapování velikostí (číslo boty → velikost)

Dle skladu: **S = 35–38, M = 39–42, L = 43–46, XL = 47–50.**
Číslo boty mimo rozsah (< 35 nebo > 50) → skupina **„mimo rozsah"** (vypíše se zvlášť, ať se data neztratí
a Luky vidí, že tam děti jsou). Prázdné/neuvedené číslo boty → skupina „bez velikosti".

## Obrazovky (záložky)

Výchozí = **Nové měření** (akční obsah hned, ne návod — Lukyho UX preference).

### 1) ➕ Nové měření
Formulář s kolonkami (pořadí):
1. Pohlaví — dvě velká přepínací tlačítka Kluk / Holka
2. Věk (roky) — číslo
3. Výška dítěte (cm) — číslo
4. Číslo boty — číslo (pod polem se hned ukáže přiřazená velikost S/M/L/XL)
5. Výška začátku stehenního svalu (cm) — číslo
6. Výška horní hrany lýtkového svalu (cm) — číslo
7. Výška spodní hrany lýtkového svalu (cm) — číslo
8. Poznámka (nepovinná) — text

- Tlačítko **Uložit měření** → přidá záznam, **vyčistí formulář** pro další dítě.
- **Kontrola pořadí výšek** (nezáväzná, jen upozornění): mělo by platit
  `lytkoSpodni < lytkoHorni < stehno`. Když ne, appka žlutě upozorní „zkontroluj výšky" — nechá uložit
  (chytí překlep v terénu, ale neblokuje výjimky).
- **Povinné pro smysluplný výpočet:** číslo boty + tři výšky (stehno, lytkoHorni, lytkoSpodni).
  Pohlaví/věk/výška dítěte jsou doplňkové (sbíráme je pro přehled, ale nechybí-li, nevadí výpočtu).

### 2) 📋 Seznam měření
- Seznam všech záznamů (počet nahoře), nejnovější první.
- U každého: velikost (S/M/L/XL), číslo boty, tři výšky, pohlaví/věk.
- **Upravit** (načte do formuláře) a **Smazat** (s potvrzením) — kdyby se Luky uklikl.

### 3) 📊 Výsledky
Pro **celkový přehled** i pro **každou velikost** (S/M/L/XL, + mimo rozsah / bez velikosti):
- **Počet dětí** ve skupině.
- Pro každou měřenou výšku (stehno, lytkoHorni, lytkoSpodni): **průměr, medián, min, max.**
- **Odvozené ideální rozměry** (z průměru i mediánu, dvě čísla vedle sebe):
  - **Výška štulpny** = agg(stehno)
  - **Pásmo lýtka pro díry:** spodek = agg(lytkoSpodni), vršek = agg(lytkoHorni),
    **střed** = (spodek + vršek) / 2, **délka svalu** = vršek − spodek.
- Skupiny s málo dětmi jsou poznat podle počtu + min–max (tenká data → ber s rezervou).

### 4) 💾 Záloha
- **Export** všech záznamů do JSON souboru.
- **Import** ze souboru (přepíše / sloučí — sloučení podle `id`, ať jde spojit měření z víc zařízení).
- **Vynulovat** (s potvrzením) pro čistý start.

## Architektura / soubory

- `mereni-nohou.html` — UI (inline JS pro DOM, formuláře, záložky, localStorage, záloha).
- `mereni-core.js` — **čisté jádro bez DOM:** mapování čísla boty na velikost, medián, průměr,
  min/max, agregace skupiny, výpočet odvozených rozměrů (výška štulpny, pásmo lýtka). Ať jde ověřit strojově.
- `tests/mereni-core.test.js` — node testy jádra (mapování velikostí vč. hranic 35/38/39/…,
  medián u sudého i lichého počtu, prázdné skupiny, mimo rozsah, odvozené rozměry, kontrola pořadí výšek).
- `index.html` / nástěnka — registrace dlaždice.
- `data/stav.json` — úkol + milník (po ověření JSON přes `node -e "require('./data/stav.json')"`).

## Mimo rozsah (YAGNI)

- Velikost/průměr díry a přesné rozmístění dvou děr — dělá Luky ručně.
- Měření obou nohou (L/P).
- Grafy/vizualizace rozložení — zatím jen čísla (průměr/medián/min-max). Případně později.
- Server/cloud sync — přenos přes Zálohu, jako zbytek HQ.
- Jména dětí — nesbíráme (netřeba, a míň starostí s GDPR).
