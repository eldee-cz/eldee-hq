# HQ task manager v1 — design

**Datum:** 2026-06-25
**Sekce:** „Otevřené úkoly" na HQ (`index.html` #ukoly)
**Cíl:** Z prosté tabulky úkolů udělat profesionálnější task manager — ruční pořadí, priorita, datum „od kdy úkol visí". Připraveno na pozdější propojení s kalendářem.

## Rozhodnutí (z brainstormingu s Lukášem)

1. **Týmový + sdílený.** Priorita a pořadí musí vidět i Doležal → data v `data/stav.json` (zdroj pravdy, sdílí se přes git). Ne localStorage.
2. **Ruční pořadí + priorita = štítek.** Dvě nezávislé věci: pořadí si Lukáš skládá sám; priorita je barevný štítek pro přehled (neřídí automaticky řazení).
3. **Posouvání:** drag myší na PC, šipky ↑↓ na mobilu (≤720 px). Drag na dotyku je nespolehlivý (95 % návštěv = mobil).

## Datový model (`stav.json`, pole `ukoly[]`)

Ke každému úkolu přibydou dvě pole (zbytek beze změny):
- `priorita`: `"vysoka" | "stredni" | "nizka"`
- `poradi`: celé číslo (vzestupně = shora dolů; menší = výš)

`vzniklo` (ISO datum, např. `"2026-06-05"`) už existuje → použije se pro „od kdy visí". Nic se nemaže ani nepřejmenovává.

## UI

### PC (tabulka, >720 px)
Sloupce zleva: úchyt `⠿` (drag) · **priorita** (štítek) · **úkol** · **od kdy** · **kdo** · **stav**.
Nahoře nad tabulkou tlačítko **„💾 Uložit pořadí"**.

### Mobil (karty, ≤720 px)
Každý úkol = karta: štítek priority + šipky `↑↓` vpravo (velké tap targety ≥44 px), pod tím text úkolu, „od kdy", kdo · stav.

### Priorita — štítek
- `vysoka` → červená (`--blood`), `stredni` → zlatá (`--gold`), `nizka` → šedá (`--muted`).
- Klik na štítek cykluje vysoka → stredni → nizka (mění `priorita` v paměti).

### „Od kdy visí"
Z `vzniklo`: zobrazí datum (`D. M.`) + počet dní do dneška (`· 20 dní`). Počítá se v prohlížeči.

## Chování řazení
- Úkoly se renderují seřazené podle `poradi` vzestupně (úkoly bez `poradi` na konec, fallback dle pořadí v poli).
- **Drag (PC):** přetažení za úchyt přeskládá pořadí → přepočítá `poradi`.
- **Šipky (mobil):** ↑/↓ prohodí úkol se sousedem → přepočítá `poradi`.

## Ukládání (statický web → sdílení)
Změny (pořadí, priorita) se mění v prohlížeči okamžitě (vizuálně, v paměti). Tlačítko **„💾 Uložit pořadí"** vygeneruje **celý aktualizovaný `stav.json`** (zachová meta, stavKarty, timeline, odkazy, tym; změní jen `ukoly`) a stáhne ho jako soubor. Lukáš ho nahraje na GitHub (přes `_import` → Jarvis, nebo přímo) → propíše se Doležalovi i na web.

## Mimo rozsah v1 (další vrstvy)
- Propojení s kalendářem (termíny, deadliny, splatnosti).
- Filtrování/skupiny, kategorie, štítky nad rámec priority.
- Automatické nahrávání na GitHub z prohlížeče (vyžaduje backend/token).
- Editace textu úkolu přímo v UI (zatím se vede přes `stav.json`/Jarvise).

## Dotčené soubory
- `data/stav.json` — přidat `priorita` + `poradi` ke stávajícím úkolům.
- `index.html` — CSS (štítky, drag, šipky, tlačítko, mobil karty) + JS (`renderUkoly` přepis: řazení, sloupce, drag/šipky handlery, priorita toggle, export `stav.json`).
