// Cloudflare Worker: nimmt RSVP-POSTs von der Website entgegen und speichert sie
// in einer Cloudflare D1 Datenbank (an den Worker gebunden, siehe README Schritt 3).
//
// Gehoert NICHT auf GitHub Pages -> wird separat bei Cloudflare deployed.

const EVENT_VALUES = ["rehearsal-dinner", "wedding-dinner", "sunday-picnic"];
const EVENT_COLUMNS = {
  "rehearsal-dinner": "rehearsalDinner",
  "wedding-dinner": "weddingDinner",
  "sunday-picnic": "sundayPicnic",
};

const CSV_COLUMNS = [
  "id", "timestamp", "attending", "firstName", "lastName", "email",
  "food", "foodNotes", "rehearsalDinner", "weddingDinner", "sundayPicnic", "car", "message",
];

function corsHeaders(origin, allowedOrigin) {
  const allowOrigin = allowedOrigin === "*" || origin === allowedOrigin ? origin || "*" : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function eventFlag(column, data) {
  const selected = Array.isArray(data.events) ? data.events : data.events ? [data.events] : [];
  const eventValue = EVENT_VALUES.find((v) => EVENT_COLUMNS[v] === column);
  return selected.includes(eventValue) ? 1 : 0;
}

function csvEscape(value) {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// GET /?key=EXPORT_KEY -> laedt alle RSVPs als CSV zum Download herunter.
async function handleExport(request, env, cors) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.EXPORT_KEY || key !== env.EXPORT_KEY) {
    return new Response("Not found", { status: 404, headers: cors });
  }

  if (!env.RSVP_DB) {
    return new Response(
      JSON.stringify({ ok: false, error: "D1 binding RSVP_DB is missing" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const { results } = await env.RSVP_DB.prepare("SELECT * FROM rsvps ORDER BY id").all();

  const lines = [CSV_COLUMNS.join(",")];
  for (const row of results) {
    lines.push(CSV_COLUMNS.map((col) => csvEscape(row[col])).join(","));
  }
  const csv = lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rsvps.csv"',
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || "*");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET") {
      return handleExport(request, env, cors);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    if (!env.RSVP_DB) {
      return new Response(
        JSON.stringify({ ok: false, error: "D1 binding RSVP_DB is missing (see README, Schritt 3)" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!data || typeof data !== "object" || !data.attending) {
      return new Response(JSON.stringify({ ok: false, error: "missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    data.timestamp = data.timestamp || new Date().toISOString();

    try {
      await env.RSVP_DB.exec(`
        CREATE TABLE IF NOT EXISTS rsvps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT,
          attending TEXT,
          firstName TEXT,
          lastName TEXT,
          email TEXT,
          food TEXT,
          foodNotes TEXT,
          rehearsalDinner INTEGER,
          weddingDinner INTEGER,
          sundayPicnic INTEGER,
          car TEXT,
          message TEXT
        )
      `.replace(/\s+/g, " ").trim());

      await env.RSVP_DB.prepare(
        `INSERT INTO rsvps
         (timestamp, attending, firstName, lastName, email, food, foodNotes,
          rehearsalDinner, weddingDinner, sundayPicnic, car, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          data.timestamp,
          data.attending || "",
          data.firstName || "",
          data.lastName || "",
          data.email || "",
          data.food || "",
          data.foodNotes || "",
          eventFlag("rehearsalDinner", data),
          eventFlag("weddingDinner", data),
          eventFlag("sundayPicnic", data),
          data.car || "",
          data.message || ""
        )
        .run();
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: `d1 error: ${err.message}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
