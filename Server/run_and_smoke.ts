import { createServer } from './index.js';

async function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

(async () => {
  const app = createServer();
  const port = 5000;
  const server = app.listen(port, () => console.log(`[run_and_smoke] server listening on http://localhost:${port}`));

  // give server a moment to settle
  await sleep(500);

  try {
    const base = `http://localhost:${port}`;
    const headers = { 'Content-Type': 'application/json' };

    async function out(name: string, obj: any) {
      console.log('\n--- ' + name + ' ---');
      try { console.log(JSON.stringify(obj, null, 2)); } catch (e) { console.log(String(obj)); }
    }

    // 1) login admin
    const loginRes = await fetch(`${base}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }) });
    const loginBody = await loginRes.json().catch(() => ({}));
    out('login status', { status: loginRes.status });
    out('login body', loginBody);

    // 2) get user by email
    const userRes = await fetch(`${base}/api/users/admin@gmail.com`);
    const userBody = await userRes.json().catch(() => ({}));
    out('getUserByEmail status', { status: userRes.status });
    out('getUserByEmail body', userBody);

    // admin token: not set, skip admin-only
    const adminToken = process.env.ADMIN_BEARER_TOKEN || null;
    out('resolved adminBearerToken present', !!adminToken);

    if (!adminToken) {
      out('skip admin checks', 'No ADMIN_BEARER_TOKEN env var found; admin-only checks skipped.');
    } else {
      const authHeaders = { Authorization: `Bearer ${adminToken}` } as any;
      const usersRes = await fetch(`${base}/api/admin/users`, { headers: { ...headers, ...authHeaders } });
      out('admin users status', { status: usersRes.status });
      out('admin users body', await usersRes.json().catch(() => ({})));
    }

    // request instructor role for student
    const reqRoleRes = await fetch(`${base}/api/auth/request-role`, { method: 'POST', headers, body: JSON.stringify({ email: 'student@gmail.com', requestedRole: 'instructor' }) });
    const reqRoleBody = await reqRoleRes.json().catch(() => ({}));
    out('request-role status', { status: reqRoleRes.status });
    out('request-role body', reqRoleBody);

    // unauthorized check
    const unauthRes = await fetch(`${base}/api/admin/users`);
    out('unauthenticated admin users status', { status: unauthRes.status });
    try { out('unauthenticated admin users body', await unauthRes.json()); } catch (e) { out('unauthenticated admin users body', 'no-json'); }

    console.log('\n[run_and_smoke] smoke test completed');
  } catch (err) {
    console.error('[run_and_smoke] Smoke test error', err);
    process.exitCode = 2;
  } finally {
    try { server.close(); } catch (_) {}
    // give node a moment to close
    await sleep(200);
    process.exit();
  }
})();
