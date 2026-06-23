# eldee HQ — kontext projektu

Sdílený kontext pro tým (Lukáš Doležal + Lukáš Hledík). Udržuje Jarvis (Claude Code) — na konci sezení sem zapisuje, co se udělalo, aby na tom mohli pracovat oba.

⚠️ **eldee-hq je VEŘEJNÉ repo.** Žádné finance, smlouvy, hesla, surová data. Jen „jak nástroje fungují / co přibylo".

---

## Kalkulačka (`kalkulacka.html`)

Interaktivní finanční + skladový model (kap. 8 knihy). Vše editovatelné, čísla jsou odhady k doladění s výrobcem. Zelené texty = ideální stav + rada, jak ho dosáhnout.

**Co umí (stav 2026-06-23, v4.0):**

1. **Produkty · ceny · prvky · mix** — návlek, ponožka, nízká/vysoká štulpna, bundle. Marže/ks se počítá z ceny, COGS, brány (2,5 % + 5 Kč) a marketingu.
2. **Prvky / příplatky** — Grip, Kapsa, Díra. U produktu se zapínají klikacími štítky → promítnou se do ceny i COGS a do celkových výsledků. Tabulka „Prvky" ukáže marži navíc/ks.
3. **MOQ ceník + sklad (plánovací)** — u každého produktu množstevní ceník (množství → cena/ks). Podle objednaného množství se vybere cena/ks → jde do COGS. Ukáže hodnotu skladu a potenciální zisk. Logika: větší MOQ = nižší cena/ks = vyšší marže.
4. **Cíle + našeptávač** — cíl čistého/měs, cílová marže/ks, cílová zásoba (měsíce). Pod řádky/sloupci zeleně rada, jak se k cíli dostat.
5. **Nejbližší události** — 5 ručních termínů (DPH, daňové přiznání…) + automatické splatnosti faktur z Příjmu zboží. Barevně podle dní do termínu (žlutá blíží se, červená po termínu).
6. **📦 Příjem zboží (faktury)** — okno přes kalkulačku. Každý řádek = jedna přijatá varianta:
   - rozbalovačky na klik: **Produkt · Barva · Provedení (grip/kapsa/díra i kombinace) · Velikost** (5 řad bot 31-34…47-50)
   - množství, cena bez DPH/ks, splatnost; **cena s DPH a celková částka se počítají samy**
   - blbuvzdorné: co chybí, svítí červeně; nezaplacené faktury hlídá odznak na tlačítku
   - barvy: Černá, Bílá + možnost přidat novou
7. **Skladem podle variant** — automaticky sečte kusy z příjmu zboží podle varianty a ukáže **SKU kód** (formát `PRODUKT-BARVA-PRVKY-VEL`, např. `VYS-CER-D-4346` = vysoká černá s dírou 43-46). Takže je vidět reálný počet kusů každé varianty.
8. **Export pro Shoptet (CSV)** — stáhne soubor (SKU, název, barva, provedení, velikost, skladem) k importu do Shoptetu. SKU + struktura jsou připravené i pro pozdější **živé API** napojení.

**Roadmap kalkulačky:**
- Živé Shoptet API (online přenos skladu → nenabízet varianty, co nejsou skladem). Potřebuje Shoptet přístupy.
- Propojení s projektem **rodinný kalendář** — pravidelné termíny (DPH, daňové přiznání, splatnosti faktur) automaticky do kalendáře.

---

## Provoz / workflow

- **Při startu eldee** Jarvis otevře GitHub stránku eldee-hq v prohlížeči (přehled stavu).
- **Na konci sezení** agent `eldee-hq-keeper` aktualizuje tenhle soubor, hlídá citlivá data a navrhne commit; push až po ohlášení Lukymu.
- Deploy eldee-hq: statický web (Vercel), push = web naživo do minuty.
