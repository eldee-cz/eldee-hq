# Sjednocení eldee knihy s HQ webem — design

**Datum:** 2026-06-07 · **Schváleno:** Lukáš (v konverzaci)

## Cíl

Kniha (8 kapitol), finanční kalkulačka a hledač klubů žijí dnes lokálně v `07-eldee-business`, zatímco tým má online jen HQ přehled. Sjednotit na jedno místo: **eldee-hq repo + Vercel**, aby obsah nebyl duplikovaný.

## Rozhodnutí

1. **Přístup:** celý tým bez hesla (rozhodnutí Lukáše; web zůstává noindex, URL se nikde veřejně nelinkuje). Citlivá čísla (marže, COGS, cíle) tím budou dostupná komukoliv s URL — vědomě akceptováno.
2. **Architektura:** přestěhovat artefakty do eldee-hq repa (žádný sync, žádný druhý web).
3. **CRM data hledače:** nepřenáší se (Lukáš začíná čistě). localStorage = per zařízení/prohlížeč, mezi členy týmu se nesdílí.

## Struktura eldee-hq po přesunu

```
eldee-hq/
  index.html              ← HQ + nová sekce „Kniha & nástroje" (karty)
  kniha.html              ← bývalý eldee-book.html
  kalkulacka.html         ← bývalá kniha/kalkulacka.html
  kluby-vyhledavac.html   ← bývalý kniha/kluby-vyhledavac.html
  data/kluby-data.json    ← bývalý databaze/kluby-data.json (kanonický dataset)
  favicon.svg
```

## Úpravy souborů

- **kniha.html:** odkazy na kalkulačku/hledač přepnout na sousední soubory (opraví i 2 dosud rozbité odkazy v TOC)
- **kluby-vyhledavac.html:** `DATA_CONFIG.url` → `data/kluby-data.json`
- **všechny 3 nové stránky:** `<meta name="robots" content="noindex, nofollow">` (pokud chybí) + odkaz „← HQ" v hlavičce
- **index.html (HQ):** sekce s kartami Kniha · Kalkulačka · Hledač klubů

## Jediná pravda od teď

- **eldee-hq repo** = živé HTML artefakty + data klubů (edituje se jen tady, push = auto-deploy)
- **07-eldee-business** = dílna (markdown kapitoly, smlouvy, dotazníky, brand podklady)
- Staré HTML v 07-eldee-business se přesunou do `_archiv-presunuto-do-hq/` (smaže Lukáš sám po ověření)
- Aktualizovat `07-eldee-business/CLAUDE.md` + `aktualni-stav.md`

## Ověření

1. Lokálně: HTTP server → kniha → kalkulačka → hledač načte 940 klubů
2. Push → kontrola živých URL na eldee-hq.vercel.app
