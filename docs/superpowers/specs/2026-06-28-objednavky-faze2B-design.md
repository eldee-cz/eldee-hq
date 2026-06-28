# Objednávky — Krok B: hlídání zásob + návrh objednávky (mozek)

**Datum:** 2026-06-28
**Soubor:** `eldee-hq/objednavky.html` (rozšíření)
**Stav:** návrh schválen (Lukáš), čeká implementaci

## Kontext

Fáze 1 (dodavatelé, šablony, svátky, kalkulačka) + Krok A (objednávky doklad, zboží na cestě, ceník, naskladnění do skladu) jsou hotové a živé. Krok B = proaktivní mozek: appka sama řekne **co, kolik a kdy objednat** a udělá z toho koncept objednávky.

## Cíl

Hlídat zásoby proti nastaveným hladinám, navrhnout doplnění (s ohledem na zboží na cestě a ceník), a — až budou data — i termín („objednej do"). Z návrhu vytvořit koncept objednávky na pár kliků.

## Rozhodnutí (z brainstormingu)

- **Logika:** ruční **min. hladina** + **cílová zásoba** per varianta (SKU). Signál „objednat" když **(sklad + na cestě) ≤ min. hladina**. Funguje i bez prodejní historie.
- **Kolik objednat:** návrh = `cílová zásoba − (sklad + na cestě)`.
- **Ceník/MOQ:** appka **nabídne dorovnání na výhodnější ceníkové pásmo** (když je blízko a dá nižší cenu/ks) — rozhodne uživatel.
- **Rychlost prodeje:** z výdejek (reason `prodej`) ve skladu za posledních N dní (default 30). Když data jsou → dopočítá „vydrží ~X dní" + „objednej do". Když ne → jen hladinový signál.
- **Napojení na Krok A:** tlačítko „Vytvořit koncept z návrhů" → koncept objednávky s navrženými položkami (dodavatele a cenu doladí v konceptu).

## Datový model (localStorage `eldeeOrders`)

Přidat:
```js
let levels = {};         // sku -> { min, target }  (jen varianty s nastavenou hladinou)
let salesWindow = 30;    // okno pro rychlost prodeje (dny), nastavitelné
```
Rozšířit `saveData`/`loadData`/reset o `levels`, `salesWindow`.

## Čtení dat (ze skladu + objednávek)

- **Stav skladu:** `stockQty(sku)` (už existuje — z `eldeeData.cardStock`).
- **Na cestě:** suma položek objednávek `status==='objednano'` per SKU (logika z `renderTransit`) → `transitQty(sku)`.
- **Rychlost prodeje:** z `eldeeData.issues` (výdejky), jen `reason==='prodej'`, jen doklady za posledních `salesWindow` dní (`created`), suma `qty` per SKU → děleno `salesWindow` = **ks/den**. Helper `salesРerDay(sku)`.

## Výpočet návrhu

```
pro každý sku v levels (kde min!=null nebo target!=null):
  avail = stockQty(sku) + transitQty(sku)
  if avail <= (min||0):
    need = max(0, (target||0) - avail)
    if need <= 0: přeskoč
    // ceníkový tip — dorovnání na nejbližší vyšší pásmo, pokud dá nižší cenu/ks
    suggestTier = nejbližší ceníkové pásmo s minQty > need, jehož price < cena na need (přes dodavatele, kteří mají ceník pro produkt)
    // prodejní data (volitelné)
    perDay = salesPerDay(sku)
    daysLeft = perDay>0 ? floor(stockQty(sku)/perDay) : null
    leadDays = leadDaysForProduct(produkt sku)   // z výrobní šablony (calcChainForward dnů), null když není šablona
    orderBy = (perDay>0 && leadDays!=null) ? den, kdy stock klesne na perDay*leadDays  (dnes + max(0, daysLeft - leadDays) dní) : null
    → návrh { sku, varianta, stock, transit, min, target, need, suggestTier, daysLeft, orderBy }
```

- `leadDaysForProduct(product)`: najdi šablonu (`chainForProduct`), `calcChainForward(chain, dnes).end − dnes` v kalendářních dnech; null když šablona není.
- `suggestTier`: projdi dodavatele s `priceTiers` pro daný produkt; najdi pásmo `minQty > need` s nejnižší `price`, pokud je nižší než cena platná pro `need`; vrať `{minQty, price, save}` nebo null. (Nezávazný tip.)

## UI

### 📊 Záložka „Hladiny zásob"

Pořadí záložek: 📦 Objednávky · 🧮 Kalkulačka · 👥 Dodavatelé · 💰 Ceníky · **📊 Hladiny** · 🏭 Výrobní šablony · 🗓️ Svátky.

- Tabulka variant s nastavenou hladinou: varianta · SKU · sklad · na cestě · **min** (input) · **cílová** (input) · 🗑.
- „➕ Přidat variantu" → formulářový řádek (produkt · barva · provedení · velikost → SKU) + min + cílová → uloží do `levels`.
- Nahoře nastavení **okna prodeje** (`salesWindow`, dní) pro výpočet rychlosti.
- Ukládá se rovnou (jako ceníky/dovolená).

### 🔔 Sekce „Doporučujeme objednat" (v záložce Objednávky, nad seznamem objednávek)

- Tabulka návrhů: **varianta · SKU · sklad · na cestě · hladina/cíl · návrh ks · tip ceník · (vydrží / objednej do)**.
  - „tip ceník": když `suggestTier` → text „dorovnej na {minQty} ks (cena {price}/ks)".
  - „vydrží / objednej do": když prodejní data → „~{daysLeft} d · objednej do {orderBy}"; jinak „—".
  - Po termínu / urgentní (avail ≤ min a daysLeft < leadDays) → červeně.
- Když nic není pod hladinou → „✓ Vše naskladněno, není co objednat."
- Tlačítko **„📝 Vytvořit koncept z návrhů"** → založí nový koncept objednávky (`status:'koncept'`) s položkami = navržené (product/color/feat/size, qty = need; pokud uživatel dřív přijal tip, qty = tier.minQty), supplierId = první dodavatel (doladí v konceptu). Přepne na formulář konceptu.

> Pozn.: každý návrh má volitelné zaškrtnutí „použít ceníkový tip" — pak se do konceptu vezme dorovnané množství. (MVP: tlačítko „dorovnat" u řádku přepne need na tier.minQty před vytvořením konceptu.)

## Mimo rozsah

- Automatické přiřazení dodavatele k návrhu (řeší se v konceptu) — zatím ne.
- Pojistná zásoba / statistické modely poptávky — zatím ne (ruční hladiny stačí).
- E-mailová/push upozornění — zatím vizuální v appce.

## Ověření

- JS bez chyb (`node`).
- Node testy: `salesPerDay` (z mock issues za okno), `transitQty`, návrhový výpočet (avail ≤ min → need = target − avail), `suggestTier` (dorovnání na vyšší pásmo s nižší cenou), `leadDaysForProduct`.
- Ruční flow: nastav hladinu u varianty (min 10, cíl 50), když sklad+cesta < 10 → objeví se v „Doporučujeme objednat" s návrhem; „Vytvořit koncept" založí koncept s položkou. Tip ceníku se ukáže, když existuje výhodnější pásmo.
- Mobile-first ≥44 px, inputy 16 px.
- Žádná citlivá data v repu — vše v localStorage.
