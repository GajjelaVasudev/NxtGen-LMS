(async ()=>{
  const base = 'http://localhost:5000';
  const headers = {'Content-Type':'application/json'};
  function out(name,obj){
    console.log('\n--- '+name+' ---');
    try{ console.log(JSON.stringify(obj,null,2)); }catch(e){ console.log(String(obj)); }
  }
  try{
    // 1) login admin (ensures DB user exists)
    const loginRes = await fetch(`${base}/api/auth/login`, { method:'POST', headers, body: JSON.stringify({ email:'admin@gmail.com', password:'admin123' }) });
    const loginBody = await loginRes.json().catch(()=>({}));
    out('login status', { status: loginRes.status });
    out('login body', loginBody);

    // 2) get user by email to retrieve DB id
    const userRes = await fetch(`${base}/api/users/admin@gmail.com`);
    const userBody = await userRes.json().catch(()=>({}));
    out('getUserByEmail status', { status: userRes.status });
    out('getUserByEmail body', userBody);
    // Prefer using a provided bearer token for admin checks. Set ADMIN_BEARER_TOKEN env var to run admin tests.
    const adminToken = process.env.ADMIN_BEARER_TOKEN || null;
    out('resolved adminBearerToken present', !!adminToken);

    if (!adminToken) {
      out('skip admin checks', 'No ADMIN_BEARER_TOKEN env var found; admin-only checks skipped.');
    } else {
      const authHeaders = { Authorization: `Bearer ${adminToken}` };
      // 3) try admin users list with bearer token
      const usersRes = await fetch(`${base}/api/admin/users`, { headers: { ...headers, ...authHeaders } });
      const usersBody = await usersRes.json().catch(()=>({}));
      out('admin users status', { status: usersRes.status });
      out('admin users body', usersBody);

      // 5) list role requests (admin)
      const requestsRes = await fetch(`${base}/api/auth/role-requests`, { headers: { ...headers, ...authHeaders } });
      const requestsBody = await requestsRes.json().catch(()=>({}));
      out('role-requests status', { status: requestsRes.status });
      out('role-requests body', requestsBody);

      // 6) fetch roles/groups/activity
      const rolesRes = await fetch(`${base}/api/admin/roles`, { headers: { ...headers, ...authHeaders } });
      out('roles status', rolesRes.status);
      out('roles body', await rolesRes.json().catch(()=>({}))); 

      const groupsRes = await fetch(`${base}/api/admin/groups`, { headers: { ...headers, ...authHeaders } });
      out('groups status', groupsRes.status);
      out('groups body', await groupsRes.json().catch(()=>({}))); 

      const activityRes = await fetch(`${base}/api/admin/activity`, { headers: { ...headers, ...authHeaders } });
      out('activity status', activityRes.status);
      out('activity body', await activityRes.json().catch(()=>({}))); 
    }

    // 4) request instructor role for student user
    const reqRoleRes = await fetch(`${base}/api/auth/request-role`, { method:'POST', headers, body: JSON.stringify({ email:'student@gmail.com', requestedRole:'instructor' }) });
    const reqRoleBody = await reqRoleRes.json().catch(()=>({}));
    out('request-role status', { status: reqRoleRes.status });
    out('request-role body', reqRoleBody);


    // 7) unauthorized check
    const unauthRes = await fetch(`${base}/api/admin/users`);
    out('unauthenticated admin users status', { status: unauthRes.status });
    try{ out('unauthenticated admin users body', await unauthRes.json()); }catch(e){ out('unauthenticated admin users body', 'no-json'); }

  }catch(err){ console.error('Smoke test error', err); process.exit(2);} 
})();
