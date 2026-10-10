/**
 * Captures browser console errors, uncaught exceptions and failed network
 * requests across the key WasteLink pages.
 *
 * Usage:
 *   1. Start Chrome with --remote-debugging-port=9222
 *   2. node backend/scripts/console-check.mjs
 */
const CDP_HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';
const API = process.env.API || 'http://localhost:4000/api';
const FRONTEND = process.env.FRONTEND || 'http://localhost:5173';

let issues = 0;

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`login failed for ${email}`);
  return json.data;
}

class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
        return;
      }
      if (msg.method) this.events.push(msg);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 20000);
    });
  }
  async goto(url) {
    this.events.length = 0;
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 2600));
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  }
  collected() {
    const out = [];
    for (const ev of this.events) {
      if (ev.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(ev.params.type)) {
        const text = (ev.params.args || [])
          .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
          .join(' ');
        if (text.trim()) out.push(`console.${ev.params.type}: ${text.trim()}`);
      }
      if (ev.method === 'Runtime.exceptionThrown') {
        const d = ev.params.exceptionDetails;
        out.push(`uncaught exception: ${d.exception?.description || d.text}`);
      }
      if (ev.method === 'Network.responseReceived') {
        const { status, url } = ev.params.response;
        if (status >= 400) out.push(`HTTP ${status} ${url}`);
      }
      if (ev.method === 'Network.loadingFailed' && !ev.params.canceled) {
        out.push(`request failed: ${ev.params.errorText}`);
      }
    }
    return [...new Set(out)];
  }
  close() {
    this.ws.close();
  }
}

async function newPage() {
  const res = await fetch(`${CDP_HOST}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, err) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => err(new Error('ws error')), { once: true });
  });
  const page = new Page(ws);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  return page;
}

const PUBLIC_PAGES = [
  ['/', 'Landing'],
  ['/login', 'Login'],
  ['/register', 'Register'],
  ['/nope-404', '404'],
];

async function main() {
  const sessions = {
    producer: await login('alice@wastelink.rw', 'Password123!'),
    collector: await login('chris@wastelink.rw', 'Password123!'),
    org: await login('ecorwanda@wastelink.rw', 'Password123!'),
    admin: await login('admin@wastelink.rw', 'Password123!'),
  };

  const rolePages = {
    producer: [
      '/producer',
      '/producer/listings',
      '/producer/listings/new',
      '/producer/requests',
      '/producer/history',
      '/notifications',
      '/profile',
    ],
    collector: [
      '/collector',
      '/collector/available',
      '/collector/recommended',
      '/collector/requests',
      '/collector/collections',
      '/profile',
    ],
    org: ['/organization', '/organization/materials', '/organization/listings', '/profile'],
    admin: [
      '/admin',
      '/admin/users',
      '/admin/collectors',
      '/admin/categories',
      '/admin/listings',
      '/admin/pickups',
      '/admin/activities',
      '/profile',
    ],
  };

  const page = await newPage();

  console.log('\n=== Public pages ===');
  for (const [path, label] of PUBLIC_PAGES) {
    await page.goto(`${FRONTEND}${path}`);
    const found = page.collected();
    if (found.length === 0) {
      console.log(`  \x1b[32mCLEAN\x1b[0m ${label}`);
    } else {
      issues += found.length;
      console.log(`  \x1b[31m${found.length} ISSUE(S)\x1b[0m ${label}:`);
      found.forEach((f) => console.log(`      ${f}`));
    }
  }

  for (const [role, paths] of Object.entries(rolePages)) {
    console.log(`\n=== ${role} pages ===`);
    for (const path of paths) {
      await page.goto(`${FRONTEND}${path}`);
      const found = page.collected();
      if (found.length === 0) {
        console.log(`  \x1b[32mCLEAN\x1b[0m ${path}`);
      } else {
        issues += found.length;
        console.log(`  \x1b[31m${found.length} ISSUE(S)\x1b[0m ${path}:`);
        found.forEach((f) => console.log(`      ${f}`));
      }
      // Sign in again in case a test cleared the token.
      await page.goto(`${FRONTEND}/login`);
      await page.eval(`localStorage.setItem('wastelink.token', ${JSON.stringify(sessions[role].token)})`);
    }
  }

  page.close();
  console.log(
    issues === 0
      ? '\n\x1b[1m=== CONSOLE: 0 errors across all pages ===\x1b[0m'
      : `\n\x1b[1m=== CONSOLE: ${issues} issue(s) found ===\x1b[0m`
  );
  process.exit(issues === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('console-check failed to run:', e.message);
  process.exit(1);
});
