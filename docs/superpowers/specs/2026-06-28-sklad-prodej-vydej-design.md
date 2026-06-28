# Sklad — Prodej / výdej (etapa 1: jen výdej)

**Datum:** 2026-06-28
**Soubor:** `eldee-hq/sklad.html`
**Stav:** návrh schválen (Lukáš), čeká implementaci

## Cíl

Sklad zatím umí jen **příjem** (zboží přibývá). Tahle etapa přidá druhou půlku: **výdej** — zboží ubývá (prodej, vzorek, dárek, reklamace, ztráta). Po uzavření výdeje se kusy odečtou ze skladu a vznikne doklad o prodeji.

**Záměrně mimo tuhle etapu** (přijde později): analytika bestsellerů, sell-through, výpočet zisku/marže, protažení tržeb do Finance kokpitu „Kam jdou peníze". Tržby ale už evidujeme, ať jsou data připravená.

## Rozhodnutí (z brainstormingu)

- **Typ úbytku:** výdej má pole **Důvod** = `prodej | vzorek | dárek | reklamace | ztráta`. Cena/ks se zadává **jen u „prodej"** (z rozdaných vzorků se tržba nepočítá).
- **Podpěrkový sklad:** výdej větší než reálný stav skladu **se zablokuje** (pole zčervená, příjemku/výdejku nelze uzavřít). Chrání před překlepem.
- **Detail prodeje:** stačí *co + za kolik*; navíc jedno **volitelné pole poznámka** na celý doklad (např. „FB — Novák").
- **Historie:** **samostatná záložka** „🧾 Historie prodejů" vedle „Historie příjmů" (ne sloučená).

## UI

Nová záložka **🛒 Prodej / výdej** (zrcadlo Příjmu zboží) + nová záložka **🧾 Historie prodejů**. Pořadí tabů:
`Skladem · Skladové karty · Příjem zboží · 🛒 Prodej/výdej · Historie příjmů · 🧾 Historie prodejů · Záloha`.

### Záložka 🛒 Prodej / výdej

Grid à la Příjem zboží. Řádek = jedna varianta. Sloupce:

| Sloupec | Popis |
|---|---|
| Produkt | rozbalovačka (PRODUCTS) |
| Barva | rozbalovačka (COLORS) |
| Provedení | rozbalovačka (feat dle produktu) |
| Velikost | rozbalovačka (sizes dle produktu) |
| Skladem | **jen pro info** — aktuální `cardStock[sku]` dané varianty |
| Ks | číslo (výdej) |
| Důvod | rozbalovačka: Prodej / Vzorek / Dárek / Reklamace / Ztráta |
| Cena/ks | číslo — **viditelné jen když Důvod = Prodej** |
| Celkem | `Ks × Cena/ks` (jen u prodeje) |
| 🗑 | smazat řádek |

Nad gridem: jedno volitelné pole **Poznámka** (na celý doklad).

**Validace:**
- Řádek je „k výdeji", když má produkt + barva + velikost + `Ks > 0`.
- **Blok:** pokud `Ks > cardStock[sku]` → pole Ks zčervená (`.bad`), v souhrnu varování, **uzavření zablokováno**.
- U důvodu `prodej` je cena povinná pro tržbu, ale výdej projde i s cenou 0 (jen tržba bude 0) — cena se nevynucuje, jen se zvýrazní prázdná.

**Pamatování ceny:** posledně zadaná prodejní cena pro danou SKU se uloží (`lastSalePrice[sku]`) a předvyplní se při příštím výběru té varianty.

**Tlačítka (panel-foot):**
- `+ Přidat řádek`
- `✅ Uzavřít výdej → odečíst ze skladu` (gold). Po uzavření: odečte kusy, vytvoří výdejku, vyčistí plochu (ponechá nedokončené řádky), přepočítá vše.

### Záložka 🧾 Historie prodejů

Seznam výdejek (nejnovější nahoře), stejný pattern jako Historie příjmů (rozbalovací řádek `▸` → položky).

Hlavička řádku: `▸` · číslo **VY-0001** · datum · důvod (souhrn — když všechny stejné, ukáže jeden; jinak „smíšený") · poznámka · počet položek · ks · **tržba** (suma `Ks × Cena` jen za řádky s důvodem prodej).

Filtr: hledání (text) + rozbalovačka Důvod (vše / prodej / vzorek / …).

Rozbalený detail: tabulka položek (Produkt, Barva, Provedení, Vel., SKU, Ks, Důvod, Cena/ks, Celkem).

## Datový model (localStorage `eldeeData`)

Přidat k existující struktuře:

```js
let sales = [ emptySaleLine() ];   // aktivní pracovní výdej (rozpracovaná výdejka)
let issues = [];                   // uzavřené výdejky (doklady), nejnovější nahoře
let issueSeq = 0;
let lastSalePrice = {};            // sku -> poslední prodejní cena
```

`emptySaleLine()`: `{ product, color, feat:[], size, qty:0, reason:'prodej', price:0 }`

**Výdejka (issue):**
```js
{
  n: 1,
  created: ISO,
  by: '—',
  note: '',
  lines: [{ product, color, feat:[], size, qty, reason, price }],
}
```

Ukládá se do `eldeeData` vedle `invoices/cardStock/receipts/...` (rozšířit `saveData()`, `loadData()`, `backup`, `restore`, `resetBtn`).

**Uzavření výdejky** (`finalizeIssue()`):
1. Vyber řádky „k výdeji".
2. Znovu ověř, že žádný nepřekračuje `cardStock` (jinak alert + návrat).
3. Pro každý řádek: `cardStock[sku] -= qty` (nikdy pod 0 — díky bloku to nenastane).
4. Vytvoř issue (`issueSeq++`), `unshift` do `issues`.
5. Ulož `lastSalePrice[sku]` u prodejních řádků.
6. Vyčisti plochu (ponech nedokončené), `saveData()`, `refreshAll()`, alert s číslem VY-XXXX a počtem odečtených ks.

## Mimo rozsah (další etapa)

- Analytika: bestsellery, sell-through (`prodáno / (sklad + prodáno)`), tip na doobjednání, rozpad na prvky („díra v X % prodejů").
- Zisk/marže: prodejní cena − nákupní (`priceMap()` už existuje).
- Protažení tržeb + zisku do `kalkulacka.html` → „Kam jdou peníze".
- Import prodejů z Shoptet CSV (až bude e-shop živý).

## Ověření

- Po implementaci `node --check` ekvivalent: ověřit JS bez chyb (otevřít stránku, žádná konzolová chyba).
- Lokální náhled `python3 -m http.server 8080`, projít: zadání výdeje, blok při překročení skladu, uzavření, odečet ze skladu, doklad v historii, záloha/restore/vynulovat berou `issues`.
- Mobile-first: tap targety ≥ 44 px, číselné inputy font 16 px (proti iOS zoomu), grid vodorovně scrollovatelný.
- Žádná citlivá data v repu (data jen v prohlížeči).
