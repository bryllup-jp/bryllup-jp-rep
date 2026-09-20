// Cloudflare Worker: Passwort-Schutz (HTTP Basic Auth) vor der ganzen Hochzeitsseite.
// Wird an eine Route gebunden, die bryllup-jp.de/* und www.bryllup-jp.de/* abdeckt
// (Worker -> Settings -> Domains & Routes). Setzt voraus, dass die DNS-Records
// proxied (orange Wolke) sind, sonst greift die Route nicht.
//
// Secret setzen (im Dashboard unter Settings -> Variables and Secrets, Typ "Secret",
// oder per CLI: wrangler secret put SITE_PASSWORT):
//   SITE_PASSWORT = das gewuenschte Passwort

// Origin, mit der die Verbindung tatsaechlich aufgebaut wird (via cf.resolveOverride).
// Host-Header/URL bleiben dabei bryllup-jp.de, damit GitHub Pages die Custom-Domain-
// Antwort liefert statt auf bryllup-jp.de zurueckzuredirecten (das wuerde sonst eine
// Redirect-Schleife durch unsere eigene Worker-Route erzeugen).
const ORIGIN_HOST = "bryllup-jp.github.io";

// Hinweis: der Browser fragt bei Basic Auth immer nach einem Benutzernamen, den
// laesst sich serverseitig nicht vorausfuellen. Der Username wird komplett
// ignoriert (siehe checkAuth) - nur das Passwort zaehlt. Der Realm-Text taucht
// als Titel im Login-Popup auf.
const REALM = "Hochzeit bryllup-jp – Benutzername beliebig, nur Passwort noetig";

function unauthorized(realm) {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function checkAuth(request, expectedPassword) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch (err) {
    return false;
  }

  // Format ist "user:password" - der Username wird ignoriert, nur das
  // Passwort zaehlt.
  const separatorIndex = decoded.indexOf(":");
  const password = separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);
  return password === expectedPassword;
}

export default {
  async fetch(request, env) {
    if (!env.SITE_PASSWORT) {
      return new Response("SITE_PASSWORT secret is not configured.", { status: 500 });
    }

    if (!checkAuth(request, env.SITE_PASSWORT)) {
      return unauthorized(REALM);
    }

    // Host-Header und URL bleiben bryllup-jp.de - resolveOverride sorgt nur
    // dafuer, dass die TCP/TLS-Verbindung zu GitHub statt (erneut) zu unserer
    // eigenen Cloudflare-Zone aufgebaut wird.
    return fetch(request, { cf: { resolveOverride: ORIGIN_HOST } });
  },
};
