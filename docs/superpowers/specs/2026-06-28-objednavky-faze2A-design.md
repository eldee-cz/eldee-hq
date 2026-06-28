# Objednávky — Krok A: objednávky jako doklad + zboží na cestě

**Datum:** 2026-06-28
**Soubor:** `eldee-hq/objednavky.html` (rozšíření) + propsání do `eldee-hq/sklad.html` dat
**Stav:** návrh schválen (Lukáš), čeká implementaci

## Kontext

Fáze 1 (dodavatelé, šablony, svátky, kalkulačka termínů) je hotová a živá. Proaktivita = 2 kroky:
- **Krok A (tento spec):** objednávky jako doklad se stavy + „zboží na cestě" + naskladnění do skladu po přijetí.
- **Krok B (příště):** skladové hladiny + rychlost prodeje + návrh „co/kolik/kdy objednat" + upozornění.

## Cíl Kroku A

Evidovat objednávky u dodavatelů: vytvořit, sledovat stav (koncept → objednáno → přijato), vidět co je „na cestě" a kdy dorazí. Po přijetí kusy naskladnit do Skladu (a tím i do Financí, které sklad čtou). Vše po variantách (SKU), data v prohlížeči.

## Rozhodnutí (z brainstormingu)

- **Stavy:** `koncept` → `objednano` → `prijato`. Padlá objednávka se **smaže** (žádný stav „zrušeno").
- **Přijetí → Sklad:** přijetí objednávky **automaticky vytvoří příjemku ve Skladu** (kusy + nákupní cena). Finance to čtou ze skladu → jedno zadání, data všude.
- **Cena:** položka má **nákupní cenu/ks** (hodnota objednávky + propsání do skladu jako nákupní cena).
- **Granularita:** po **variantách (SKU)** — produkt + barva + provedení + velikost.
- **ETA:** termín dodání se počítá z výrobní šablony produktu (kalkulačka z Fáze 1). ETA objednávky = **nejpozdější** dodání ze všech položek.

## Sdílení dat se Skladem (klíčové)

Objednávky a Sklad běží na stejném původu (eldee-hq.vercel.app) → objednavky.html může číst i zapisovat skladový localStorage `eldeeData`. Aby **SKU seděly 1:1** mezi appkami:

- **Variantní číselník zkopírovat ze `sklad.html` do `objednavky.html`** (nahradit dosavadní zjednodušený `PRODUCTS`):
  `ALL8, TUBE_FEAT, SOCK_SIZES, TUBE_SIZES, SIZE_EU`, plný `PRODUCTS` (`{id,name,code,feat,sizes}`), `FL, FC, FEAT_ORDER`, `noDia, colorCode, featNorm, featKey, featCode, prodDef, skuOf`.
  > `PRODUCTS` zůstává kompatibilní s Fází 1 (id/name beze změny, jen přibude code/feat/sizes). `productIds` u šablon a `calcProduct` fungují dál.
- **COLORS čte ze skladu:** při startu načíst `eldeeData.colorsList` → stejné barvy jako sklad (fallback `[Bílá, Černá]`).
- **Čtení skladu** (pomocné): `loadStock()` → `JSON.parse(localStorage.eldeeData||'{}')` pro `cardStock` (aktuální stav — zobrazí se u položky, info).
- **Zápis přijetí** (`receiveOrder`): načti `eldeeData`, pro každou položku `cardStock[sku] += qty`, přidej `receipt` se strukturou skladu (`{n, created, by:'Objednávka', faktura:'OBJ-<id>', due:'', paid:false, lines:[{product,color,feat,size,qty,net:price,num:'OBJ-<id>',due:''}]}`), `receiptSeq++`, ulož zpět. Sklad i Finance to uvidí při svém příštím načtení.

## Datový model (localStorage `eldeeOrders`)

Přidat:
```js
let orders = [];     // objednávky
let orderSeq = 0;    // číslování OBJ-XXXX
// order = {
//   id, supplierId, status:'koncept'|'objednano'|'prijato',
//   created:ISO, ordered:'YYYY-MM-DD'|'', eta:'YYYY-MM-DD'|'', received:ISO|'',
//   note, items:[{ product, color, feat:[], size, qty, price }]
// }
```
Rozšířit `saveData`/`loadData`/`reset`/`backup`(celý LS) o `orders`, `orderSeq`.

## UI

Pořadí záložek: **📦 Objednávky (výchozí)** · 🧮 Kalkulačka termínů · 👥 Dodavatelé · 🏭 Výrobní šablony · 🗓️ Svátky & volno.
(Dosavadní „Nová objednávka" = kalkulačka → přejmenovat na „🧮 Kalkulačka termínů" a posunout za Objednávky.)

### 📦 Objednávky

**Přehled** (3 sekce / filtr stavu):
- **📝 Koncepty** — rozpracované; tlačítka: Upravit, „✅ Objednat", Smazat.
- **🚚 Na cestě (objednáno)** — dodavatel, datum objednání, **ETA + kolik dní zbývá** (po termínu červeně), hodnota, položek; tlačítka: „📥 Přijato → naskladnit", Upravit, Smazat.
- **✓ Přijaté** — historie (rozbalovací položky), datum přijetí. Smazat.

Nahoře **„➕ Nová objednávka"**.

**🚚 Zboží na cestě (souhrn)** — panel: sečte položky všech objednávek ve stavu `objednano` per SKU → tabulka (varianta, SKU, kusů na cestě, nejbližší ETA). To je vstup pro Krok B.

**Formulář objednávky** (koncept; pattern jako šablony/dodavatelé):
- **Dodavatel** (rozbalovačka).
- **Položky**: řádek = produkt · barva · provedení · velikost (→ SKU) · skladem (info z `cardStock`) · počet ks · nákupní cena/ks · řádková hodnota · smazat. „+ Položka".
- **Poznámka** (volitelná).
- Souhrn: počet položek, kusů, **hodnota objednávky**, **ETA** (nejpozdější dodání spočítané z šablon — přepočítává se podle data objednání; v konceptu se ukáže ETA „kdyby ses objednal dnes").
- Tlačítka: **💾 Uložit koncept**, **✅ Objednat** (uloží + status `objednano` + zafixuje `ordered`=dnes a `eta`), Zrušit.

### ETA výpočet

```
etaForOrder(order, fromDate):
  pro každou položku: chain = chainForProduct(item.product)
    if chain & kroky: end = calcChainForward(chain, fromDate).end ; else: end = fromDate
  ETA = max(end přes položky)   // kdy dorazí poslední položka
```
V konceptu `fromDate = dnes`; při „Objednat" `fromDate = ordered` a ETA se uloží.

## Propsání přijetí

`receiveOrder(order)`:
1. Načti `eldeeData`; `cardStock`/`receipts`/`receiptSeq` (fallbacky).
2. `order.items` → `cardStock[skuOf(...)] += qty`.
3. Přidej `receipt` (viz struktura výše) na začátek `receipts`, `receiptSeq++`.
4. Ulož `eldeeData`.
5. `order.status='prijato'`, `order.received=ISO`; `saveData()` (eldeeOrders).
6. Hláška: „Objednávka OBJ-XXXX přijata, naskladněno N ks do Skladu."

## Mimo rozsah (Krok B + dál)

- Skladové hladiny (reorder point), rychlost prodeje z výdejek, návrh „co/kolik/kdy objednat", upozornění — **Krok B**.
- MOQ (minimální množství) — zavede Krok B u návrhu (v Kroku A se cena/množství zadávají ručně).
- Stav „na cestě" zvlášť od „objednáno", částečné dodávky, online napojení na dopravce — zatím ne.

## Ověření

- JS bez chyb (`node` syntax check).
- Node test: `skuOf` v objednavky.html dává stejné SKU jako sklad pro tutéž variantu; `etaForOrder` vrací nejpozdější datum; `receiveOrder` zapíše do `eldeeData` správné `cardStock`/`receipt`.
- Ruční flow v prohlížeči: nová objednávka (koncept) → Objednat → na cestě s ETA → Přijato → ve Skladu přibyly kusy + příjemka OBJ-… (otevřít sklad.html, ověřit). „Zboží na cestě" sčítá správně.
- Mobile-first ≥44 px, inputy 16 px.
- **Žádná citlivá data v repu** — vše v localStorage.
