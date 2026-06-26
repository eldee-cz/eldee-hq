# Finance — peníze (kokpit) — design

**Datum:** 2026-06-26 · **Stav:** schváleno Lukášem, staví se (lokálně, nepushovat na živé HQ)

## Princip
Sklad = realita (zboží, příjem, stav, prodej). **Finance = peníze** (ceny, marže, provozní náklady, kam jdou peníze, daně). Přestavět `eldee-hq/kalkulacka.html` do **záložek** (jako Sklad), osekat duplicity se Skladem, přidat moduly nákladů/analýzy/daní.

## Záložky
1. **💵 Ceny & marže** — produkty (cena · COGS · mix · prvky grip/kapsa/díra · **marže Kč i %**), **MOQ ceník + plánovač šarže** (objednáno × cena/ks = náklad, kolik zbyde z kapitálu, proužek), **cíle + výsledky** (vážená marže, break-even, prodejů/měs na cíl, obrat), scénáře, parametry (marketing, fixní, klub, daň. koef., kapitál), prvky (cogs/price). → VYHOZENO: pole „skladem", KPI hodnota skladu / potenciální zisk ze skladu, příjem zboží modal (dělá Sklad).
2. **🧾 Náklady & faktury** — provozní faktury/náklady: datum · kategorie (Marketing/Výplaty/Pronájem/Vybavení/Software/Doprava/Ostatní) · popis · částka · splatnost · zaplaceno. Filtr (kategorie, hledání, zaplaceno). **Skladové nákupy** se natáhnou read-only z příjemek Skladu (`eldeeData.receipts`) jako kategorie „Zboží" — nezadáváš dvakrát.
3. **📊 Kam jdou peníze** — rozpad nákladů po kategoriích (Kč + % proužek) za období; náklady provozní + zboží (ze Skladu). (Tržby/zisk plně až bude prodejní analytika v Skladu — zatím odhad z modelu / ručně.)
4. **🏦 Daně & rezerva** — orientační odhad daně OSVČ **vedlejší** (prodej zboží = volná živnost): metoda výdajů (paušál 60 % / skutečné), daň z příjmu 15 % − sleva na poplatníka, sociální+zdravotní (vedlejší, nad rozhodnou částku) → **„odkládej si X Kč/měsíc"**. Vše editovatelné, silný disclaimer „potvrď s účetní".
5. **🧮 DPH plátce/neplátce** — stávající kalkulačka (zachovat, přesun do záložky).

## Data
- Vlastní úložiště **`eldeeFinance`** (oddělené od skladového `eldeeData`, ať se nepřepisují): `{ products, addons, globals, expenses[], events[] }`. Persist edits (ceny/mix/náklady).
- **Čte** `eldeeData.receipts` (Sklad) read-only → skladové nákupy do analýzy (kategorie Zboží) + COGS.
- Záloha/načtení Financí (vlastní), nezávislá na Skladu.

## Zachovat (logika z kalkulacky)
`activeTier/tierPrice/effCogs/effPrice/marginOf`, recalc (vážená marže, break-even, units), `recalcDPH`, scénáře, prvky. Osekat blok výroba&sklad o `stock`/`stockVal`/`stockProfit`/cover.

## Pořadí stavby
Dávka 1: záložky + Ceny&marže (osekané) + Náklady&faktury + DPH + persist. Dávka 2: Kam jdou peníze + Daně&rezerva.

## Ověření
JS bez chyb, lokální test (server), záložky/filtry fungují, persist drží, skladové nákupy se natáhnou. Nepushovat na živé HQ (test režim jako Sklad).
