/* Zámek na eldee HQ — Basic Auth před vším kromě výkladní skříně.
   Kokpit a všechny nástroje (kalkulačka, kniha, sklad, finance…) jsou jen pro tým.
   Skříň /eldee a to, co k jejímu vykreslení potřebuje, jde ven bez hesla.

   Heslo se bere z proměnné prostředí HQ_HESLO (Vercel → Settings → Environment Variables).
   NIKDY ho nepiš sem do souboru — repo je verzované.

   Whitelist je záměrně výčtem, ne výjimkami: co tu není, je zamčené.
   Když přibude veřejná stránka, musí se sem dopsat — jinak ji nikdo zvenčí neotevře.  */

/* Zapojení je ve vercel.json → proxy.entrypoint (běží na Node.js runtime).
   Přípona .mjs je schválně: kdyby se dal do repa package.json s "type": "module",
   staly by se ESM i hq-core.js a všechny testy, a ty jsou CommonJS. */

// přesné cesty, které jdou ven bez hesla
const VEREJNE = [
  '/eldee',
  '/eldee.html',
  '/data/vitrina.json',
  '/favicon.svg',
];

// prefixy, které jdou ven bez hesla (obrázky pro skříň)
const VEREJNE_PREFIXY = [
  '/media/',
];

function jeVerejne(cesta) {
  if (VEREJNE.includes(cesta)) return true;
  return VEREJNE_PREFIXY.some(p => cesta.startsWith(p));
}

function hesloSedi(hlavicka, ocekavane) {
  if (!hlavicka) return false;
  const [schema, kod] = hlavicka.split(' ');
  if (schema !== 'Basic' || !kod) return false;
  let dekodovane;
  try {
    dekodovane = atob(kod);
  } catch {
    return false;
  }
  const zadane = dekodovane.slice(dekodovane.indexOf(':') + 1);
  // porovnání v konstantním čase, ať se heslo nedá uhádat po znacích
  if (zadane.length !== ocekavane.length) return false;
  let rozdil = 0;
  for (let i = 0; i < ocekavane.length; i++) {
    rozdil |= zadane.charCodeAt(i) ^ ocekavane.charCodeAt(i);
  }
  return rozdil === 0;
}

export default function middleware(request) {
  const cesta = new URL(request.url).pathname;

  if (jeVerejne(cesta)) return; // undefined = pusť dál na statický soubor

  const heslo = process.env.HQ_HESLO;
  // Pojistka: když heslo není nastavené, web se nezamkne natvrdo (šlo by se
  // vyzamknout z vlastního HQ). Absenci hlásíme do logu.
  if (!heslo) {
    console.warn('HQ_HESLO není nastavené — zámek je vypnutý!');
    return;
  }

  if (hesloSedi(request.headers.get('authorization'), heslo)) return;

  return new Response('eldee HQ — interní. Veřejná stránka je na /eldee\n', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="eldee HQ", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
