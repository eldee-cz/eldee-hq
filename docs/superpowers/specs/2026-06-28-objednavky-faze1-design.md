# Dlaždice Objednávky — Fáze 1: dodavatelé, výrobní šablony, kalkulačka termínů

**Datum:** 2026-06-28
**Soubor:** `eldee-hq/objednavky.html` (nový) + dlaždice na HQ
**Stav:** návrh schválen (Lukáš), čeká implementaci

## Kontext a celková vize

Sklad řeší „co fyzicky mám". Nová dlaždice **📋 Objednávky** řeší „co a kdy musím pořídit", aby se sklad nevyprazdňoval. Celý systém je velký, proto rozdělen na **4 fáze**:

- **Fáze 1 (tento spec):** evidence dodavatelů + výrobní šablony (řetězce kroků) + automatické svátky + dovolené + **kalkulačka termínů** (kdy dorazí / kdy objednat). Vše nastavitelné, žádná napevno zadaná čísla.
- **Fáze 2:** zakládání objednávek + „zboží na cestě" + propsání do skladu po dodání.
- **Fáze 3:** návrh objednávky (reorder) — z rychlosti prodeje + skladu + zboží na cestě + lead time spočítá kdy a kolik objednat.
- **Fáze 4:** finanční strop — návrh respektuje peníze (napojení na Finance).

## Cíl Fáze 1

Postavit **kostru a výpočetní logiku**: kam zadávat dodavatele, jejich časy, kroky výroby, svátky a dovolené — a z toho počítat reálné termíny přes pracovní dny. Konkrétní data (jména, LT, přepravci) zatím nejsou; appka musí umožnit jejich vložení a editaci.

## Rozhodnutí (z brainstormingu)

- **Délka kroku:** u každého kroku zvlášť volba **pracovní dny** (přeskakuje víkendy/svátky/dovolené) vs **kalendářní dny** (jede i o víkendu — typicky doprava).
- **Výrobní řetězce:** **šablony** (např. „Štulpna s výšivkou", „Návlek bez výšivky"), přiřaditelné k produktům. Změna šablony se propíše všem produktům s ní.
- **Svátky:** počítají se **automaticky** dle země (ČR plně; PL/DE/SK připravené podle stejného klíče — pevné dny + pohyblivé odvozené od Velikonoc). + ruční doplnění vlastních dnů.
- **Dovolená:** zadává se **kalendářními týdny** (např. `W28, W29`) — dodavatelská i naše. Neodhaduje se, doplňuje ručně.
- **Citlivost:** jména dodavatelů a časy jsou **citlivá** (konkurenční výhoda). HQ je veřejné repo → data žijí **jen v prohlížeči (localStorage)**, do repa nikdy. Sdílení přes zálohu (soubor). Stejný princip jako sklad/finance.
- **Pořadí záložek:** výchozí = **pracovní okno** (Nová objednávka / plánovací kalkulačka), nastavení (dodavatelé, šablony, svátky) až za ním.

## UI — záložky

`objednavky.html`, vizuální styl 1:1 podle `sklad.html` (tmavá + zlatá, taby, panely, mobile-first ≥44 px, inputy 16 px). KPI pruh zatím není (přijde ve Fázi 2 s objednávkami na cestě).

### 🧮 1. Nová objednávka (výchozí, pracovní okno)

Plánovací kalkulačka. Ve Fázi 1 počítá a zobrazuje; **neukládá** (uložení = Fáze 2).

- Vstup: **produkt nebo výrobní šablona** (rozbalovačka) + **režim**:
  - **Dopředu:** „Objednám k datu → kdy dorazí?" — zadáš start, ukáže výsledný termín + **rozpad po krocích** (každý krok: od–do, dodavatel, kolik dní, co se přeskočilo).
  - **Zpětně:** „Chci mít k datu → kdy nejpozději objednat?" — zadáš cílové datum, spočítá nejzazší start.
- Výstup: čitelná časová osa kroků s daty + souhrn celkové doby (pracovní vs kalendářní dny zvlášť informativně).
- Když šablona/produkt nemá přiřazený řetězec → hláška „nejdřív přiřaď šablonu v záložce Výrobní šablony".

### 👥 2. Dodavatelé

Seznam + „➕ Nový dodavatel" + editace + smazání. Pole:
- **Jméno** (text) · **Země** (rozbalovačka: ČR, SK, PL, DE, … — řídí svátky) · **Lead time** (dní, číslo, volitelné) · **Dovolená** (kalendářní týdny, text typu `W28, W29`) · **Poznámka** (text).
- Smazání hlídá vazbu: pokud je dodavatel použit v kroku šablony → upozornit.

### 🏭 3. Výrobní šablony

Seznam šablon + „➕ Nová šablona" + editace + smazání. Šablona:
- **Název** (text).
- **Kroky** (seřazené, přidat/odebrat/posunout): každý krok = **název** (text, např. „Pletení", „Doprava", „Výšivka") · **dodavatel** (rozbalovačka ze seznamu dodavatelů, volitelné — doprava nemusí mít) · **délka** (dní, číslo) · **typ dní** (pracovní | kalendářní).
- **Přiřazení produktů**: u šablony zaškrtneš, které produkty (z `PRODUCTS` skladu) ji používají. Jeden produkt = max jedna šablona.

### 🗓️ 4. Svátky & volno

- **Státní svátky** (auto): přehled svátků pro vybranou zemi a rok (počítané), jen ke kontrole. Editovatelné = přidání vlastních dnů.
- **Naše dovolená / volno**: kalendářní týdny (`W30`) nebo konkrétní dny — co my nepracujeme/neodesíláme.
- **Vlastní volné dny**: ruční přidání (datum + popis + země/„naše").

## Datový model (localStorage, klíč `eldeeOrders`)

```js
let suppliers = [];   // {id, name, country, ltDays, vacationWeeks:[28,29], note}
let chains = [];      // {id, name, steps:[{name, supplierId|null, days, dayType:'work'|'cal'}], productIds:[]}
let ourVacation = { weeks:[], days:[] };   // naše volno: čísla týdnů + ISO dny
let customHolidays = [];  // {country|'*', date:'YYYY-MM-DD', name}
let settings = { defaultCountry:'CZ' };
```

- `id`: rostoucí sekvence (jako u skladu), nebo `Date.now`-free counter (`seq`).
- Ukládání/načítání/záloha/restore/vynulování stejným vzorem jako sklad (`saveData`/`loadData`).
- **Týden → datum:** ISO kalendářní týden. Týden W28 roku R = rozsah Po–Ne. Helper `weekRange(year, w)`.

## Výpočetní jádro

```
holidaysFor(country, year) -> Set('YYYY-MM-DD')
  CZ: pevné (1.1, 1.5, 8.5, 5.7, 6.7, 28.9, 28.10, 17.11, 24.–26.12)
      + pohyblivé (Velký pátek, Velikonoční pondělí) z Velikonoc (Meeus/Gauss).
  PL/DE/SK: stejný vzor — pevná tabulka + pohyblivé od Velikonoc. (DE základ federální.)
  + customHolidays pro danou zemi.

isOff(date, country, supplierVacationWeeks)
  -> víkend? státní svátek země? týden v dovolené dodavatele? naše volno (pokud krok bez dodavatele = naše)?

addStep(startDate, days, dayType, country, vacationWeeks)
  dayType='cal': prostě + days kalendářních dnů.
  dayType='work': posouvej po dnech, počítej jen ne-off dny, dokud nenapočítáš `days`.
  -> endDate

calcChainForward(chain, startDate)
  projdi kroky; pro každý: country = dodavatelova země (nebo defaultCountry),
  vac = dodavatelova dovolená; end = addStep(...); řetěz dál od end.
  -> { end, steps:[{name, from, to, days, dayType}] }

calcChainBackward(chain, targetDate)
  jdi kroky pozpátku, odečítej -> nejzazší start.
```

> Velikonoce (Meeus/Jones/Butcher algoritmus) = jediný „chytrý" výpočet; ostatní svátky jsou pevná data. Vše offline, žádné API (statický web).

## HQ napojení

- Nová dlaždice na HQ dashboardu (`stav.json` → `stavKarty`/`odkazy`) „📋 Objednávky" → `objednavky.html`.
- Úkol na nástěnce: Fáze 1 hotovo, Fáze 2–4 ve frontě.

## Mimo rozsah Fáze 1 (další fáze)

- Zakládání a ukládání objednávek, „zboží na cestě", stavy průchodu řetězcem (Fáze 2).
- Propsání dodané objednávky do skladu jako příjem (Fáze 2).
- Návrh kdy/kolik objednat z prodejů (Fáze 3).
- Finanční strop dle cashflow (Fáze 4).
- Přesné svátkové tabulky všech zemí mimo CZ (přidají se podle potřeby; struktura připravena).

## Ověření

- JS bez chyb (`node` syntax check extrakcí `<script>`).
- Jádro otestovat v Node: Velikonoce 2026 = 5.4.; CZ svátky 2026 sedí; `addStep` přes víkend/svátek/dovolenou počítá správně; forward a backward jsou navzájem konzistentní (forward(start)→end, backward(end)→start).
- Lokální náhled v prohlížeči: CRUD dodavatelů a šablon, kalkulačka oběma směry, žádná konzolová chyba.
- Mobile-first ≥44 px, inputy 16 px.
- **Žádná citlivá data v repu** — vše v localStorage.
