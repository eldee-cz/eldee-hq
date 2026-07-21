# Spec — 📏 Měření nohou v2 (rozšíření dlaždice)

**Datum:** 2026-07-21
**Autor:** Hledík + Jarvis
**Navazuje na:** `2026-07-07-mereni-nohou-velikostni-studie-design.md` (v1)
**Soubory:** `mereni-nohou.html`, `mereni-core.js`, `tests/mereni-core.test.js`

## Kontext a cíl

Dlaždice **📏 Měření nohou** (v1, živě od 7.7.) sbírá v terénu do mobilu měření dětských nohou a počítá ideální rozměry štulpny per velikost (S/M/L/XL). Zatím měří jen **výšky** od podlahy. Tento upgrade (v2) přidává tři věci, které Lukáš potřebuje:

1. **Nový rozměr — obvod lýtka.** Výšky neříkají, jak *těsně* štulpna sedí. Obvod ano.
2. **Rychlejší sběr v terénu** — svižnější zadávání čísel a plynulý průchod víc dětí za sebou.
3. **Silnější Výsledky + výstup pro výrobce** — vidět rozptyl, vědět kdy je vzorek dost velký, a mít co poslat výrobci.

Vše zůstává **mobile-first**, bez jmen (GDPR-light), data jen v prohlížeči (localStorage `eldee-mereni-v1`), přenos přes Zálohu. Architektura beze změny: čisté výpočty v `mereni-core.js` (+ node testy), vzhled v `mereni-nohou.html`.

## Rozhodnutí z brainstormingu (recap)

- **Obvod = 1 hodnota** (nejširší místo lýtka), **nepovinná**. Žádná výška toho bodu navíc — jen samotný obvod (jeden hmat metrem).
- **Doporučená hodnota pro výrobce = medián** (odolný vůči jednomu špatně změřenému dítěti). Vedle něj průměr a rozpětí. **Appka nikdy nerozhoduje za Lukáše** — jen doporučuje.
- **Graf = tečkový pás** (u malých vzorků líp ukáže rozptyl a odlehlé dítě než histogram).
- **Výstup pro výrobce = tisknutelná stránka + CSV** syrových dat.
- **Práh pokrytí = ~10 dětí/velikost** (jen vodítko, nic neblokuje).

## Rozsah — 4 části

### 1. Obvod lýtka (nový rozměr)

- Nové pole záznamu `obvodLytka` (number | null), **nepovinné**.
- **Formulář:** číselný input, label „Obvod lýtka — nejširší místo (cm)", `inputmode="decimal"`, `step="0.5"`. Umístění: za tři výšky (logický konec měření nohy), před poznámku.
- **Propsání skrz appku:**
  - `readForm` / `editRecord` / `clearForm` — čtou, předvyplní, vyčistí.
  - **Seznam** — v meta řádku ukázat obvod, když je (`· obvod 34 cm`).
  - **Výsledky** — nový řádek „Obvod lýtka" v tabulce rozměrů (průměr/medián/min–max) pro *celkem* i každou velikost. Počítá se přes stávající `stats()` (null hodnoty ignoruje sám → děti bez obvodu prostě nevstupují).
  - **Export/Import (JSON)** — automaticky součást objektu, žádná změna kódu zálohy.
- **Nezávislý na výškách** — kontrola pořadí výšek (`orderOk`) se obvodu netýká.

### 2. Rychlejší sběr v terénu

**a) Zadávání čísel — plynulý přechod mezi poli**
- Číselná pole dostanou `enterkeyhint="next"`; na Enter (tlačítko „další" na numerické klávesnici) JS přesune fokus na **další číselné pole** ve fixním pořadí: věk → výška → bota → stehno → lýtko horní → lýtko spodní → obvod. Numerická klávesnice se nezavírá.
- Poznámka (textarea) je mimo řetěz (Enter = nový řádek). Za obvodem se fokus dál neposouvá (žádné auto-uložení — ať se omylem neuloží nekompletní záznam).

**b) Pohlaví „drží" z minulého dítěte**
- Po uložení nového záznamu se vybrané pohlaví **nevynuluje** — zůstane přednastavené na další dítě (měříš tým kluků → nepřepínáš dokola). `clearForm` tedy resetuje vše kromě pohlaví. (Při editaci existujícího záznamu se pohlaví nastaví dle záznamu jako dnes.)

**c) Průchod víc dětí za sebou**
- **Počítadlo** u tlačítka / v hlavičce: „Naměřeno teď: N · celkem M" (N = záznamy uložené v této relaci, M = celkem v prohlížeči).
- Po uložení: formulář se vyčistí, stránka skočí nahoru (`scrollTo(0,0)`) a fokus se postaví na **první měřené pole dalšího dítěte** (věk).

### 3. Silnější Výsledky

**a) Tečkový pás (dot-strip)**
- Pro každou velikost i *celkem* vykreslit malý graf pro **dva klíčové rozměry: výška štulpny (stehno) a obvod lýtka**. (Ne pro každý rozměr — kvůli přehlednosti.) Graf obvodu se skryje, když u dané skupiny nikdo obvod nemá.
- **Render:** čisté inline SVG (žádná knihovna). Osa = rozsah min–max s malým okrajem, každá tečka = jedno dítě, svislá čára = medián, popisky min / medián / max.
- Umístění: pod tabulkami v každém bloku velikosti.

**b) Pokrytí vzorku**
- Nahoře ve Výsledcích souhrnný přehled: pro S/M/L/XL počet dětí + **barevný semafor**. Práh `DOPORUCENO = 10`: `<5` červená („málo"), `5–9` oranžová („střední"), `≥10` zelená („dost"). Text: „Pokrytí S: 3/10 — potřeba víc".
- Nic neblokuje — jen vodítko, kdy je vzorek dost velký na rozhodnutí.

### 4. Souhrn pro výrobce

**a) Tisknutelná stránka**
- Nová záložka **🏭 Výrobce** s čistým layoutem + tlačítko „🖨 Vytisknout / uložit PDF" (`window.print()`). `@media print` schová záložky a ostatní sekce, vytiskne jen tento souhrn.
- **Obsah per velikost:** doporučený rozměr = **medián** (výška štulpny, obvod lýtka), vedle **průměr** a **rozpětí (min–max)**, počet dětí. Navíc odvozené pro díry (střed lýtka, délka svalu). Hlavička: eldee, datum vygenerování, celkový počet měření. Patička: „Doporučená hodnota = medián. Finální rozměry volí eldee."

**b) CSV export (syrová data)**
- V Záloze tlačítko „⬇ Export CSV (syrová data)". Jeden řádek = jedno dítě. Sloupce: `velikost;pohlavi;vek;vyskaTela;cisloBoty;stehno;lytkoHorni;lytkoSpodni;obvodLytka;poznamka;vytvoreno`. Oddělovač **středník** + **UTF-8 BOM** (české Excel čte diakritiku a nerozbíjí sloupce). Stažení přes Blob jako stávající JSON export.

## Datový model

Rozšířený záznam (localStorage klíč beze změny — `eldee-mereni-v1`):

```js
{
  id, pohlavi, vek, vyskaTela, cisloBoty,
  stehno, lytkoHorni, lytkoSpodni,
  obvodLytka,        // NOVÉ: number | null (nepovinné)
  poznamka, vytvoreno
}
```

Staré záznamy `obvodLytka` nemají (undefined) → v kódu ošetřit jako `null`. Žádná migrace.

## Architektura

- **`mereni-core.js`** (čisté funkce, bez DOM):
  - `deriveSizeStats` rozšířit o `obvodLytka` (přes stávající `stats()`).
  - `pluck(records, key)` → pole čísel pro graf (bez null).
  - `coverage(zaznamy, prah=10)` → per velikost `{n, stav:'malo'|'stredni'|'dost'}`.
- **`mereni-nohou.html`:** nové pole, next-field flow, sticky pohlaví, session counter, SVG tečkový pás (kreslí z hodnot z core), pokrytí, záložka Výrobce, CSV export, print styl.
- **`tests/mereni-core.test.js`:** rozšířit — obvod v agregaci, `coverage` prahy, `pluck`.

## Zpětná kompatibilita

- Staré zálohy (bez `obvodLytka`) se naimportují beze změny; obvod = prázdno; agregace ho ignoruje.
- Žádná migrace localStorage, klíč `eldee-mereni-v1` zůstává.

## Testy (jak ověříme)

- **node testy jádra:** obvod v mean/median/min-max, `coverage` prahy (4 / 7 / 12 dětí → malo/stredni/dost), `pluck` ignoruje null.
- **Ruční proklik (mobil):** dítě s obvodem i bez, editace, export/import staré zálohy, graf, pokrytí, tisk do PDF, CSV do Excelu (diakritika, sloupce).
- **Headless kontrola:** JS syntaxe OK, assety 200, `mereni-core.js` se načte.

## Mimo rozsah (YAGNI)

- Výška bodu max obvodu (jen hodnota obvodu).
- Cloud / víc měřičů naráz — zůstává export/import (samostatný budoucí krok).
- Automatické finální rozhodnutí rozměrů — appka jen doporučuje medián.
- Víc obvodů (2 nebo 3 body) — teď jen 1.
- Historie/verzování záznamů, grafy pro každý rozměr.

## Otevřené / na potvrzení Lukášem

- Práh pokrytí `10`/velikost — sedí, nebo jiné číslo?
- Grafy jen pro štulpnu + obvod (ne pro hrany lýtka) — OK?
