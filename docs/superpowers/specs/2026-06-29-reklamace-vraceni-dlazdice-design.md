# Dlaždice „Reklamace & vrácení" — design

**Datum:** 2026-06-29
**Autor:** Doležal + Jarvis
**Stav:** návrh ke schválení
**Soubor k vytvoření:** `eldee-hq/reklamace.html` (+ drobná read-only úprava `sklad.html`)

---

## 1. Účel

Evidenční systém pro tři procesy spojené s reklamacemi a vrácením zboží, jako příprava na ostrý provoz e-shopu:

1. **Reklamace zákazníka (RZ)** — vadné zboží, které k nám vrací zákazník.
2. **Reklamace u dodavatele (RD)** — vadné zboží, které my reklamujeme u výrobce.
3. **Vrácení do 14 dnů (VR)** — odstoupení od smlouvy bez udání důvodu; zboží **není vadné** a po kontrole se vrací do prodeje.

Systém eviduje celý životní cyklus každého případu (kdo, co, kdy, proč, lhůta + kolik zbývá, navrhované vs provedené vyřízení), umí filtrovat/hledat, automaticky čísluje a — což je jádro — **správně hýbe skladem přes oddělené kbelíky**, aby vadné zboží nikdy nešlo znovu do prodeje.

**Mimo rozsah (vědomě):** vrácení 14 dní u zboží zakoupeného v kamenném obchodě (jen e-shop); automatické generování reklamačních protokolů/PDF; e-mailová komunikace se zákazníkem; napojení na živé Shoptet API.

---

## 2. Skladový model — dva kbelíky + převodky

Klíčové rozhodnutí. Každá varianta (SKU) má **dva fyzické stavy**:

- **🟢 Prodejní sklad** = kusy, které lze prodat. **Jen tento kbelík jde na Shoptet** (= dnešní `cardStock`).
- **🔧 Reklamační sklad** = vadné / řešené kusy. **Neprodejné, Shoptet je nevidí.** Rozlišuje dva pod-stavy:
  - **u nás** — kus fyzicky držíme (čeká na posouzení / odeslání dodavateli),
  - **u dodavatele** — kus jsme odeslali výrobci, čeká na vyřízení.

Mezi kbelíky se zboží přesouvá **převodkou** = doklad s auditní stopou (datum, SKU, počet, odkud → kam, kvůli kterému případu). **Žádný pohyb se neděje automaticky/tiše** — uživatel ho potvrdí tlačítkem, až nastane fyzicky. Tím se vyhneme dvojímu odečtu a stavu, kdy appka nabízí k prodeji kus, který reálně nemáme.

### Modelový tok (příklad 10 ks)

| Krok | 🟢 Prodejní | 🔧 Rekl. (u nás) | 🔧 Rekl. (u dod.) |
|---|---|---|---|
| Start | 10 | 0 | 0 |
| Prodej 1 ks (výdejka „prodej") | 9 | 0 | 0 |
| Zákazník reklamuje, vrátí vadný kus → příjem do reklamačního | 9 | 1 | 0 |
| Odeslání dodavateli (RD) → převodka u nás → u dodavatele | 9 | 0 | 1 |
| Dodavatel vrátí opravený/nový kus → příjem do prodejního | 10 | 0 | 0 |
| *(varianta)* dobropis/peníze → odpis z reklamačního | 9 | 0 | 0 |

### Přehled skladových dopadů (vše potvrzované tlačítkem)

| Událost | Pohyb |
|---|---|
| RZ — zákazník vrátil vadný kus | **+1 reklamační (u nás)**; prodejní beze změny (kus byl odepsán už prodejem) |
| RZ — výměna zákazníkovi (pošleme nový dobrý kus) | **−1 prodejní** (výdej dobrého kusu zákazníkovi) |
| Vadný kus nalezen v prodejním skladu (zahájení RD) | **−1 prodejní → +1 reklamační (u nás)** (převodka) |
| RD — odesláno dodavateli | **reklamační: u nás −1 → u dodavatele +1** (převodka) |
| RD — vráceno opravené / výměna od dodavatele | **−1 reklamační (u dod.) → +1 prodejní** |
| RD — dobropis / peníze (kus se nevrací) | **−1 reklamační** (odpis, nikam) |
| VR — zboží přijato a v pořádku | **+1 prodejní** (znovu prodejné) |
| VR — zboží přijato poškozené | řeší se jako RZ, ne jako vrácení |

---

## 3. Záložky a evidovaná pole

Společné pro všechny případy: **auto-číslo**, **stav** (workflow), **datum vzniku**, **produkt + varianta (SKU) + počet** (ze skladového číselníku), **popis/důvod**, **navrhované vyřízení** vs **provedené vyřízení**, **lhůta + zbývá X dní** (barevně), **datum vyřízení**, **poznámka**.

### 3.1 🙋 Reklamace zákazníka (RZ)
- Zákazník: jméno, e-mail/telefon
- Číslo objednávky (z e-shopu)
- Datum nákupu → appka pohlídá, zda spadá do **reklamační lhůty (24 měs)** = nárok
- Datum uplatnění reklamace
- Produkt + SKU + počet, popis vady
- **Lhůta na vyřízení** (default 30 dní od uplatnění) → *zbývá X dní*, po termínu červeně
- Navrhované řešení (co zákazník chce) / provedené řešení (číselník: oprava · výměna · sleva · vrácení peněz · zamítnuto)
- Tlačítko **„→ Reklamovat u dodavatele"** = z RZ založí navázanou RD (stejný vadný kus)
- Tlačítko skladového pohybu: **„📥 Přijmout vadný kus (do reklamačního)"**, příp. **„📤 Výměna — vydat nový kus"**

### 3.2 🏭 Reklamace u dodavatele (RD)
- Dodavatel (z kartotéky v Objednávkách)
- Produkt + SKU + počet, popis vady
- Datum reklamace · datum odeslání zboží · **termín vyřízení** (dohodnutý s dodavatelem) → *zbývá X dní*
- Vazba na objednávku (OBJ-XXXX) a na RZ (z čeho vzešlo)
- Navrhované / provedené řešení (oprava · výměna · dobropis · sleva · zamítnuto)
- Tlačítka skladu: **„📤 Stáhnout z prodeje"** (jen když je vadný kus ještě v prodejním skladu: prodejní → reklamační u nás), **„📤 Odesláno dodavateli"** (u nás → u dodavatele), **„📥 Vráceno / výměna"** (u dodavatele → prodejní), **„🗑 Dobropis — odepsat"**

### 3.3 ↩️ Vrácení do 14 dnů (VR)
- Zákazník + číslo objednávky
- Datum převzetí zboží → appka pohlídá, zda odstoupil **do 14 dnů** = nárok
- Datum odstoupení
- Produkt + SKU + počet
- **Lhůta na vrácení peněz** (default 14 dní od přijetí zboží) → *zbývá X dní*
- Částka k vrácení, stav
- Tlačítko: **„📥 Přijmout zpět do prodeje"** (po kontrole; +1 prodejní)

---

## 4. Auto-číslování

Nový případ dostane číslo dle typu z odděleného čítače:
`RZ01, RZ02, …` / `RD01, RD02, …` / `VR01, VR02, …` (min. 2 číslice, po 99 přirozeně pokračuje 3 ciframi). Číslo je trvalé, slouží k odkazování, filtrování a hledání.

---

## 5. ⚙️ Lhůty & nastavení (editovatelné)

Přednastaveno dle českého práva (2026), uživatel může měnit:
- Lhůta na vyřízení reklamace: **30 dní**
- Reklamační lhůta (právo vytknout vadu): **24 měsíců**
- Lhůta na odstoupení od smlouvy: **14 dní**
- Lhůta na vrácení peněz po odstoupení: **14 dní**
- Číselník způsobů vyřízení (oprava · výměna · sleva · vrácení peněz · dobropis · zamítnuto) — výchozí sada, rozšiřitelná

> Hodnoty jsou orientační pomůcka, ne právní poradenství.

---

## 6. Filtrování, hledání, souhrn

Nad každou záložkou: fulltext (číslo, jméno, SKU, text) + filtr podle **stavu** a podle **termínu** („po termínu" / „blíží se ≤ 3 dny"). Souhrnný proužek: např. *„otevřených 3 · po termínu 1"*. Barevné zvýraznění lhůt sjednotit s patternem úkolů/kalendáře na HQ (po termínu červeně, ≤ 3 dny žlutě).

---

## 7. Bonus — přehled kvality (volitelné, lze odložit do v2)

Malý panel: počet reklamací, **% uznaných**, **nejčastěji reklamovaná varianta/vada**. Munice pro jednání s dodavatelem („tahle barva má 8 % reklamací") a signál o kvalitě produktu. Levné na dodělání, ale není kritické pro spuštění.

---

## 8. Datový model a izolace

- **Vlastní úložiště dlaždice:** `localStorage['eldeeReklamace']` =
  `{ seq:{RZ,RD,VR}, claims:[…], settings:{…}, updated }`, kde každý `claim` nese typ, číslo, pole dle typu, stav a `history[]` (log akcí vč. skladových pohybů).
- **Reklamační kbelík ve skladu:** do `localStorage['eldeeData']` přibude `claimStock = { [sku]: { own, supplier } }`. **Vlastníkem a editorem je dlaždice Reklamace** (zapisuje vzorem „načti → uprav → ulož", jako to dělá naskladnění objednávky `receiveOrder`). `sklad.html` ho jen **čte a zobrazuje** (read-only sekce/sloupec „🔧 na reklamaci").
- **Pohyby přes prodejní sklad** (vstup/výstup z `cardStock`) navíc vytvoří doklad ve Skladu pomocí stávajícího mechanismu — výdejka s důvodem `reklamace` (už existuje) při odpisu z prodeje, příjemka při návratu do prodeje — aby Sklad měl konzistentní auditní historii.
- **Čte z cizích dlaždic (read-only):** dodavatele z `eldeeOrders.suppliers`, skladový číselník variant/SKU a `cardStock` z `eldeeData`.
- **Komponenty** (logické celky v `reklamace.html`): (a) evidence + číslování, (b) výpočet lhůt/zbývá, (c) skladové převodky, (d) filtr/hledání, (e) nastavení. Každý celek má jasnou odpovědnost a jde testovat samostatně.

---

## 9. Bezpečnost a citlivost dat

- **Jména a kontakty zákazníků = osobní údaje (GDPR).** Data zůstávají **jen v prohlížeči (localStorage)**, nikdy se necommitují do veřejného repa. Sdílení/záloha jen přes soubor (jako Sklad/Objednávky).
- Záloha: export/import JSON celé dlaždice (vč. nastavení).
- Po editaci žádný zápis do `stav.json` s citlivými údaji.

---

## 10. Testování

- `node --check` na JS v `reklamace.html`.
- Funkční testy jádra (mimo prohlížeč, na vyjmuté logice): auto-číslování (RZ/RD/VR oddělené řady), výpočet *zbývá X dní* + nárok (24 měs / 14 dní), skladové dopady na modelovém toku 10 ks (každý řádek tabulky v §2), shoda SKU se skladovým číselníkem.
- Ruční proklik v prohlížeči (Luky): založení případu každého typu, převodky, filtr, záloha/obnova; ověřit, že `sklad.html` zobrazuje reklamační kbelík a prodejní stav sedí.
- Ověřit, že `eldeeData` se po zápisu z reklamace nerozbije (ostatní klíče zachované) a JSON je platný.

---

## 11. Otevřené otázky k potvrzení

1. **Bonus přehled kvality (§7)** — udělat rovnou, nebo odložit na v2?
2. Prefix vrácení **VR** vyhovuje? (alternativa: VZ)
