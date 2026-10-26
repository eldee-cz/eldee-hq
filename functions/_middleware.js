/* Zámek na eldee HQ pro Cloudflare Pages — Basic Auth před vším kromě výkladní skříně.
   Stejná pravidla jako middleware.ts (Vercel); ten zůstává, dokud HQ běží i na Vercelu.

   Heslo se bere z proměnné prostředí HQ_HESLO (Cloudflare → Workers & Pages → projekt
   → Settings → Variables and Secrets, typ Secret). NIKDY ho nepiš sem do souboru.

   Whitelist je záměrně výčtem, ne výjimkami: co tu není, je zamčené.
   Když přibude veřejná stránka, musí se sem dopsat — jinak ji nikdo zvenčí neotevře.

   Rozdíl proti Vercelu: když HQ_HESLO chybí, web se ZAMKNE (503), ne otevře.
   Repo je privátní a kokpit nese interní čísla — chybějící heslo nesmí znamenat
   otevřené dveře. Spravit se to dá kdykoli v nastavení projektu na Cloudflare. */

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

export function jeVerejne(cesta) {
  if (VEREJNE.includes(cesta)) return true;
  return VEREJNE_PREFIXY.some(p => cesta.startsWith(p));
}

export function hesloSedi(hlavicka, ocekavane) {
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

// kokpit nemá co dělat ve vyhledávačích — ani přihlášený, ani skříň na této adrese
async function bezIndexace(odpoved) {
  const r = new Response(odpoved.body, odpoved);
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return r;
}

export async function onRequest({ request, env, next }) {
  const cesta = new URL(request.url).pathname;

  if (jeVerejne(cesta)) return bezIndexace(await next());

  const heslo = env.HQ_HESLO;
  if (!heslo) {
    console.error('HQ_HESLO není nastavené — HQ je zamčené pro všechny.');
    return new Response('eldee HQ — dočasně nedostupné (chybí nastavení zámku).\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  if (hesloSedi(request.headers.get('authorization'), heslo)) return bezIndexace(await next());

  return new Response('eldee HQ — interní. Veřejná stránka je na /eldee\n', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="eldee HQ", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
