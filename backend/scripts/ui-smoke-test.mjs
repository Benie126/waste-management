/**
 * WasteLink browser UI smoke test.
 *
 * Drives real headless Chrome through the Chrome DevTools Protocol to verify
 * that each role's pages render with live data from the API.
 *
 * Usage:
 *   1. Start the backend (port 4000) and frontend dev server (port 5173).
 *   2. Start Chrome with remote debugging:
 *        chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp>
 *   3. node backend/scripts/ui-smoke-test.mjs
 */
const CDP_HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const API = process.env.API || 'http://localhost:4000/api';
const FRONTEND = process.env.FRONTEND || 'http://localhost:5173';

let pass = 0;
let fail = 0;
const ok = (m) => {
  pass++;
  console.log(`  \x1b[32mPASS\x1b[0m ${m}`);
};
const bad = (m) => {
  fail++;
  console.log(`  \x1b[31mFAIL\x1b[0m ${m}`);
};
const say = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login failed for ${email}: ${json.message}`);
  return json.data;
}

/** Minimal CDP client over the built-in WebSocket (Node 22+). */
class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 20000);
    });
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    // Wait for the SPA to fetch data and render.
    await new Promise((r) => setTimeout(r, 2500));
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async text() {
    return (await this.eval('document.body.innerText')) || '';
  }

  close() {
    this.ws.close();
  }
}

async function newPage() {
  const res = await fetch(`${CDP_HOST}/json/new?about:blank`, { method: 'PUT' });
  if (!res.ok) throw new Error(`cannot create CDP tab: ${res.status} ${await res.text()}`);
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP websocket error')), { once: true });
  });
  const page = new Page(ws);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  return page;
}

/** Signs a user in by writing the JWT into localStorage, then visiting a path. */
async function visitAs(page, session, path) {
  await page.goto(`${FRONTEND}/login`);
  await page.eval(`localStorage.setItem('wastelink.token', ${JSON.stringify(session.token)})`);
  await page.goto(`${FRONTEND}${path}`);
  return page.text();
}

function expect(label, text, needles) {
  const missing = needles.filter((n) => !text.toLowerCase().includes(n.toLowerCase()));
  if (missing.length === 0) ok(label);
  else bad(`${label} (missing: ${missing.join(', ')})`);
}

async function main() {
  const [producer, collector, admin, org] = await Promise.all([
    login('alice@wastelink.rw', 'Password123!'),
    login('chris@wastelink.rw', 'Password123!'),
    login('admin@wastelink.rw', 'Password123!'),
    login('ecorwanda@wastelink.rw', 'Password123!'),
  ]);

  // Make the verification page deterministic:
  //   Chris (user 4) -> VERIFIED so the collector dashboard shows VERIFIED
  //   Diana (user 5) -> PENDING so the verification page lists somebody
  const setVerification = (userId, status) =>
    fetch(`${API}/admin/collectors/${userId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ status }),
    });
  await setVerification(4, 'VERIFIED');
  await setVerification(5, 'PENDING');

  const page = await newPage();

  try {
    say('1. Landing page (public)');
    // The Chrome profile persists localStorage between runs; clear any stale
    // session so an already-signed-in user is not redirected off the landing page.
    await page.goto(`${FRONTEND}/login`);
    await page.eval('localStorage.removeItem("wastelink.token")');
    await page.goto(`${FRONTEND}/`);
    expect('landing page renders', await page.text(), [
      'WasteLink',
      'Connect recyclable waste',
      'How it works',
      'Create an account',
    ]);

    say('2. Producer pages');
    let t = await visitAs(page, producer, '/producer');
    expect('producer dashboard renders', t, ['Welcome, Alice', 'Active Listings', 'Recent Waste Listings', 'Pickup Requests']);

    t = await visitAs(page, producer, '/producer/listings');
    expect('my listings renders with data', t, ['My Waste Listings', 'Plastic', 'Kicukiro', 'AVAILABLE']);

    t = await visitAs(page, producer, '/producer/listings/new');
    expect('create listing form renders', t, ['Create Waste Listing', 'Waste category', 'Quantity', 'Location / area']);

    t = await visitAs(page, producer, '/producer/requests');
    expect('pickup requests page renders', t, ['Pickup Requests']);

    t = await visitAs(page, producer, '/producer/history');
    expect('collection history renders', t, ['Collection History']);

    say('3. Collector pages');
    t = await visitAs(page, collector, '/collector');
    expect('collector dashboard renders', t, ['Welcome, Chris', 'Available Listings', 'Collector profile', 'VERIFIED']);

    t = await visitAs(page, collector, '/collector/available');
    expect('available waste renders with listings', t, ['Available Waste', 'Plastic', 'Kicukiro']);

    t = await visitAs(page, collector, '/collector/recommended');
    expect('recommendations render', t, ['Recommended Waste']);

    t = await visitAs(page, collector, '/collector/requests');
    expect('collector requests render', t, ['My Pickup Requests']);

    t = await visitAs(page, collector, '/collector/collections');
    expect('collections render', t, ['Collections', 'Completed']);

    say('4. Recycling organization pages');
    t = await visitAs(page, org, '/organization');
    expect('organization dashboard renders', t, ['EcoRwanda Recycling', 'Accepted materials', 'Relevant listings']);

    t = await visitAs(page, org, '/organization/materials');
    expect('accepted materials page renders', t, ['Accepted Materials', 'Plastic', 'Glass']);

    t = await visitAs(page, org, '/organization/listings');
    expect('organization listings render', t, ['Relevant Recyclable Waste']);

    say('5. Admin pages');
    t = await visitAs(page, admin, '/admin');
    expect('admin dashboard renders with stats', t, ['Admin Dashboard', 'Total users', 'Users by role', 'Collectors verified']);

    t = await visitAs(page, admin, '/admin/users');
    expect('users page renders accounts', t, ['Users', 'admin@wastelink.rw', 'alice@wastelink.rw', 'ADMIN']);

    t = await visitAs(page, admin, '/admin/collectors');
    expect('collector verification renders', t, ['Collector Verification', 'Diana Collector', 'Gasabo']);

    t = await visitAs(page, admin, '/admin/categories');
    expect('categories page renders', t, ['Waste Categories', 'Plastic', 'Electronic Waste']);

    t = await visitAs(page, admin, '/admin/listings');
    expect('admin listings render', t, ['Waste Listings', 'Plastic']);

    t = await visitAs(page, admin, '/admin/pickups');
    expect('pickup activities render', t, ['Pickup Activities']);

    t = await visitAs(page, admin, '/admin/activities');
    expect('system activities render', t, ['System Activities']);

    say('6. Common pages');
    t = await visitAs(page, producer, '/profile');
    expect('profile page renders', t, ['My Profile', 'Account', 'alice@wastelink.rw']);

    t = await visitAs(page, producer, '/notifications');
    expect('notifications page renders', t, ['Notifications']);

    say('7. RBAC redirects in the browser');
    // Producer opening an admin URL must be redirected to their own dashboard.
    t = await visitAs(page, producer, '/admin');
    expect('producer redirected away from /admin', t, ['Welcome, Alice']);
    if (!t.includes('Admin Dashboard')) ok('producer never sees the admin dashboard');
    else bad('producer saw the admin dashboard');

    t = await visitAs(page, collector, '/admin/users');
    expect('collector redirected away from /admin/users', t, ['Welcome, Chris']);
    if (!t.includes('Users by role')) ok('collector never sees admin users page');
    else bad('collector saw the admin users page');

    t = await visitAs(page, admin, '/collector/available');
    expect('admin redirected away from collector area', t, ['Admin Dashboard']);

    say('8. Session handling');
    // Corrupt token -> the app must send the user back to login.
    await page.goto(`${FRONTEND}/login`);
    await page.eval(`localStorage.setItem('wastelink.token', 'invalid.token.value')`);
    await page.goto(`${FRONTEND}/producer`);
    const t2 = await page.text();
    expect('invalid token returns user to login', t2, ['Welcome back', 'Sign in']);

    console.log(`\n\x1b[1m=== UI RESULT: ${pass} passed, ${fail} failed ===\x1b[0m`);
  } finally {
    page.close();
  }

  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nUI smoke test failed to run:', err.message);
  process.exit(1);
});
