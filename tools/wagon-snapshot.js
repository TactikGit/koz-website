/* ════════════════════════════════════════════════════════════
   KOZ WEBSITE — WagOn stats snapshot
   Pulls all Master_Orders from the WagOn Creator app (read-only),
   computes PUBLIC-SAFE aggregates, writes:
     V2/data/stats.json     → counts only, rendered on the website
     V2/data/coverage.json  → city list for the future coverage map
                              (NOT rendered; publish decision pending)

   Credentials: read from the tactik-skill config OUTSIDE this folder
   (TACTIK_SKILL_CONFIG env var, or the default path below).
   No secrets ever live in the website folder.

   Run:  node tools/wagon-snapshot.js     (from the V2 folder)
   Cadence: manual for now; schedule on a server-class surface
   (GitHub Actions / Azure Function) at go-live — never on a laptop.
   ════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.TACTIK_SKILL_CONFIG || 'C:/Dev/tactik-memory/tactik-skill/config.json';
const OWNER = 'yanick_tactikrecycling';
const APP = 'wagon';
const REPORT = 'Master_Orders';
const FIELDS = [
  'OrderNum_AutoNUM',
  'ShipperAddr_OrdersSL',
  'ReceiverAddr_OrdersSL',
  'KozDelivered_OrdersDT',
  'TransportStatus_OrdersLU',
  'LoadType_OrdersLU',
  'OriginCountry_OrdersSL',
].join(',');

const CA_PROVINCES = new Set(['QC', 'ON', 'NB', 'NS', 'PE', 'NL', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU']);
const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);

async function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).zoho_oauth;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    refresh_token: cfg.refresh_token,
  });
  const res = await fetch(cfg.token_endpoint, { method: 'POST', body: params });
  const json = await res.json();
  if (!json.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(json));
  return json.access_token;
}

async function fetchAllOrders(token) {
  const all = [];
  let cursor = null;
  let page = 0;
  while (true) {
    page++;
    const url = `https://www.zohoapis.com/creator/v2.1/data/${OWNER}/${APP}/report/${REPORT}`
      + `?max_records=1000&field_config=custom&fields=${encodeURIComponent(FIELDS)}`;
    const headers = { Authorization: 'Zoho-oauthtoken ' + token };
    if (cursor) headers.record_cursor = cursor;
    const res = await fetch(url, { headers });
    if (res.status === 404) break; // Creator returns 404 code 9280 when no more records
    const json = await res.json();
    const rows = json.data || [];
    all.push(...rows);
    console.log(`  page ${page}: ${rows.length} records (total ${all.length})`);
    cursor = res.headers.get('record_cursor');
    if (!cursor || rows.length === 0) break;
  }
  return all;
}

function parseAddr(addr) {
  // Format observed in WagOn: "City, ST, Postal" — tolerate variants.
  if (!addr || !addr.includes(',')) return null;
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const city = parts[0];
  const region = (parts[1] || '').toUpperCase();
  if (!city || region.length !== 2) return null;
  return { city, region };
}

function compute(orders) {
  let delivered = 0;
  let maxOrderNum = 0;
  const provinces = new Set();
  const usStates = new Set();
  const cityCount = new Map(); // "City, ST" -> mentions
  const loadTypes = {};
  const originCountries = new Set();

  for (const r of orders) {
    const num = parseInt(r.OrderNum_AutoNUM, 10);
    if (!isNaN(num) && num > maxOrderNum) maxOrderNum = num;

    const status = r.TransportStatus_OrdersLU && r.TransportStatus_OrdersLU.zc_display_value;
    if ((r.KozDelivered_OrdersDT || '').trim() !== '' || status === '15 - Delivered') delivered++;

    const lt = (r.LoadType_OrdersLU && r.LoadType_OrdersLU.zc_display_value) || null;
    if (lt) loadTypes[lt] = (loadTypes[lt] || 0) + 1;

    const oc = (r.OriginCountry_OrdersSL || '').trim();
    if (oc) originCountries.add(oc.toUpperCase());

    for (const a of [r.ShipperAddr_OrdersSL, r.ReceiverAddr_OrdersSL]) {
      const p = parseAddr(a);
      if (!p) continue;
      if (CA_PROVINCES.has(p.region)) provinces.add(p.region);
      else if (US_STATES.has(p.region)) usStates.add(p.region);
      else continue; // unknown region token — excluded from public counts
      const key = `${p.city}, ${p.region}`;
      cityCount.set(key, (cityCount.get(key) || 0) + 1);
    }
  }

  // Region-level mention counts (shipper + receiver touches) — safe aggregates for the coverage map
  const regionMentions = {};
  for (const [place, n] of cityCount.entries()) {
    const region = place.split(', ').pop();
    regionMentions[region] = (regionMentions[region] || 0) + n;
  }

  const generated_at = new Date().toISOString();
  const stats = {
    generated_at,
    source: 'WagOn · Master_Orders (aggregates only)',
    orders_lifetime: maxOrderNum,
    loads_delivered: delivered,
    provinces: [...provinces].sort(),
    us_states: [...usStates].sort(),
    us_states_count: usStates.size,
    states_provinces_total: provinces.size + usStates.size,
    cities_served: cityCount.size,
    regions: regionMentions,
    load_types: loadTypes,
    countries_in_road_data: 1 + (usStates.size > 0 ? 1 : 0), // CA + US from road addresses only
    origin_countries_seen: [...originCountries].sort(),
  };
  const coverage = {
    generated_at,
    _note: 'City-level coverage for the future map. NOT wired to the site — publish decision pending (lanes can reveal customer locations).',
    cities: [...cityCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([place, mentions]) => ({ place, mentions })),
  };
  return { stats, coverage };
}

(async () => {
  console.log('WagOn snapshot — Master_Orders (read-only)');
  const token = await getAccessToken();
  const orders = await fetchAllOrders(token);
  if (orders.length === 0) throw new Error('No records returned — aborting without writing.');
  const { stats, coverage } = compute(orders);

  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'stats.json'), JSON.stringify(stats, null, 2));
  fs.writeFileSync(path.join(__dirname, 'coverage.json'), JSON.stringify(coverage, null, 2));

  console.log('\nstats.json:');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\ncoverage.json: ${coverage.cities.length} places (top: ${coverage.cities.slice(0, 5).map(c => c.place).join(' · ')})`);
})().catch(e => { console.error('SNAPSHOT FAILED:', e.message); process.exit(1); });
