# Sklad — skladové karty + sekce (design)

**Datum:** 2026-06-26
**Stav:** schváleno Lukášem, staví se

## Cíl
Rozšířit `eldee-hq/sklad.html` o **proklikávací sekce** a hlavně o **Skladové karty** = pevný očíslovaný seznam všech variant s editovatelným stavem (inventura), chytrým klíčem číslování (barva drží blok → snadné hledání při inventuře).

## Struktura stránky (sekce-taby nahoře)
🗂️ **Skladové karty** (výchozí) · 📦 **Příjem zboží** · 💾 **Záloha**
+ KPI proužek nahoře (kusů skladem · variant skladem · hodnota skladu · k zaplacení).

## Rozměry per produkt (číselník)
| Produkt | code | Provedení | Velikosti |
|---|---|---|---|
| Návlek/tunel | NAV | Základní, Kapsa, Díra, Kapsa+Díra *(bez gripu)* | S, M, L |
| Tréninková ponožka | PON | všech 8 (Základní/Grip/Kapsa/Díra + kombinace) | S, M, L, XL |
| Nízká štulpna | NIZ | všech 8 | S, M, L, XL |
| Vysoká štulpna | VYS | všech 8 | S, M, L, XL |
| Bundle | BND | všech 8 | S, M, L, XL |

Velikosti = standardní: **S**=35-38, **M**=39-42, **L**=43-46, **XL**=47-50 (mapování zobrazit jako podtitul). Barvy: Bílá, Černá (rozšiřitelné).

**Počet karet:** 140/barva → **280 karet** (Bílá 1–140, Černá 141–280). Rozšiřitelné (nový produkt/barva = úprava číselníku).

## Skladové karty (jádro)
- Tabulka: **# · Produkt · Barva · Provedení · Velikost · SKU · Stav (editovatelný) · Hodnota**.
- **Číslování:** barva → produkt → provedení → velikost. Číslo = pozice v kanonickém řazení (přepočítá se při růstu, barva vždy drží blok = bílá první). SKU např. `NAV-BIL-K-M`.
- **Stav píšeš ručně** (inventura) → ukládá se do `cardStock[sku]`.
- **Tlačítko „⬇ Napumpovat příjem"** — přičte kusy z Příjmu zboží podle SKU. Každý řádek příjmu se napumpuje jen jednou (flag `pumped` na řádku), ať se nedvojí.
- **Filtry/hledání:** barva (vše/bílá/černá), produkt, „jen skladem", „nízký stav", textové hledání (SKU/název).
- Export pro Shoptet (CSV) z karet se stavem > 0.
- Karty **zakotvené** = generují se z číselníku, needitují se jako seznam (jen stav).

## Příjem zboží (stávající grid, vylepšený)
- Rozbalovačky **podle produktu:** vybraný produkt určí dostupná provedení + velikosti (tunel → S/M/L + bez gripu; ostatní → S/M/L/XL + 8). SKU se generuje novými kódy velikostí (S/M/L/XL).
- Zbytek (č. faktury, DPH, cena, splatnost, zaplaceno, výpočty) beze změny.
- Migrace starých velikostí (39-42→M atd.) při načtení.

## Data + KPI
- localStorage `eldeeData`: `{ invoices[], colors[], vatRate, cardStock{sku:qty}, updated }`.
- KPI: kusů skladem (Σ cardStock) · variant skladem (karty qty>0) · hodnota (Σ qty × poslední nákupní cena SKU z příjmu) · k zaplacení (z příjmu).
- Záloha/Načti = celý `eldeeData` (příjem + karty).

## Ověření
JSON/JS bez chyb, headless/lokální test: karty se vygenerují (280), stav se ukládá, napumpování sedí podle SKU, filtry fungují, příjem product-aware. Push HQ.
