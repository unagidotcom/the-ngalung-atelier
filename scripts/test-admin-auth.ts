import http from 'http';

function request(options: http.RequestOptions, data?: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string; json: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode || 0, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function postJson(urlPath: string, payload: any, headers: Record<string, string> = {}) {
  const body = JSON.stringify(payload);
  return request({
    hostname: 'localhost',
    port: 3000,
    path: urlPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...headers
    }
  }, body);
}

function get(urlPath: string, headers: Record<string, string> = {}) {
  return request({
    hostname: 'localhost',
    port: 3000,
    path: urlPath,
    method: 'GET',
    headers
  });
}

async function testAdminFlow() {
  console.log('=== TESTING ADMIN ACCESS & SECURITY ROUTE /admin ===\n');

  // Test 1: Accessing admin APIs without token (Must be 401)
  console.log('1. Testing unauthenticated access to /api/admin/auth/me and /api/admin/orders...');
  const unauthMe = await get('/api/admin/auth/me');
  const unauthOrders = await get('/api/admin/orders');
  console.log(`   GET /api/admin/auth/me => HTTP ${unauthMe.status} (${unauthMe.json?.error || unauthMe.body})`);
  console.log(`   GET /api/admin/orders  => HTTP ${unauthOrders.status} (${unauthOrders.json?.error || unauthOrders.body})`);

  // Test 2: Invalid admin login credentials
  console.log('\n2. Testing invalid login credentials...');
  const invalidLogin = await postJson('/api/admin/auth/login', {
    email: process.env.ADMIN_EMAIL || 'missing-admin-email',
    password: 'wrong-password-123'
  });
  console.log(`   POST /api/admin/auth/login (Bad Password) => HTTP ${invalidLogin.status} (${invalidLogin.json?.message})`);

  const invalidEmail = await postJson('/api/admin/auth/login', {
    email: 'invalid-admin',
    password: process.env.ADMIN_PASSWORD || 'missing-admin-password'
  });
  console.log(`   POST /api/admin/auth/login (Bad Email) => HTTP ${invalidEmail.status} (${invalidEmail.json?.message})`);

  // Test 3: Correct login credentials
  console.log('\n3. Testing valid login with ADMIN_EMAIL and ADMIN_PASSWORD...');
  const targetEmail = process.env.ADMIN_EMAIL;
  const targetPass = process.env.ADMIN_PASSWORD;
  if (!targetEmail || !targetPass) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to run this test.');
  }
  const validLogin = await postJson('/api/admin/auth/login', {
    email: targetEmail,
    password: targetPass
  });
  console.log(`   POST /api/admin/auth/login => HTTP ${validLogin.status}, Success: ${validLogin.json?.success}`);
  const sessionToken = validLogin.json?.token;
  console.log(`   Issued Session Token: ${sessionToken ? sessionToken.substring(0, 16) + '...' : 'NONE'}`);

  // Test 4: Verifying session with /api/admin/auth/me
  console.log('\n4. Testing session verification with Bearer token...');
  const verifiedMe = await get('/api/admin/auth/me', { 'Authorization': `Bearer ${sessionToken}` });
  console.log(`   GET /api/admin/auth/me => HTTP ${verifiedMe.status}, User: ${verifiedMe.json?.user?.email} (${verifiedMe.json?.user?.role})`);

  // Test 5: Accessing protected admin data with valid token
  console.log('\n5. Accessing protected admin datasets...');
  const adminStats = await get('/api/analytics/stats', { 'Authorization': `Bearer ${sessionToken}` });
  const adminOrders = await get('/api/admin/orders', { 'Authorization': `Bearer ${sessionToken}` });
  console.log(`   GET /api/analytics/stats => HTTP ${adminStats.status}, Total Revenue: ₹${adminStats.json?.stats?.totalRevenue}`);
  console.log(`   GET /api/admin/orders => HTTP ${adminOrders.status}, Orders count: ${adminOrders.json?.orders?.length}`);

  // Test 6: Logout
  console.log('\n6. Testing admin logout and session revocation...');
  const logoutRes = await postJson('/api/admin/auth/logout', {}, { 'Authorization': `Bearer ${sessionToken}` });
  console.log(`   POST /api/admin/auth/logout => HTTP ${logoutRes.status}, Message: "${logoutRes.json?.message}"`);

  // Test 7: Post-logout access attempt with revoked token
  console.log('\n7. Testing access after logout with revoked token...');
  const postLogoutMe = await get('/api/admin/auth/me', { 'Authorization': `Bearer ${sessionToken}` });
  const postLogoutOrders = await get('/api/admin/orders', { 'Authorization': `Bearer ${sessionToken}` });
  console.log(`   GET /api/admin/auth/me (Revoked Token) => HTTP ${postLogoutMe.status} (${postLogoutMe.json?.error})`);
  console.log(`   GET /api/admin/orders (Revoked Token)  => HTTP ${postLogoutOrders.status} (${postLogoutOrders.json?.error})`);

  const passed = unauthMe.status === 401 &&
                 invalidLogin.status === 401 &&
                 validLogin.status === 200 &&
                 verifiedMe.status === 200 &&
                 adminStats.status === 200 &&
                 logoutRes.status === 200 &&
                 postLogoutMe.status === 401 &&
                 postLogoutOrders.status === 401;

  console.log(`\nALL ADMIN ROUTE & AUTH TESTS PASSED: ${passed}`);
}

testAdminFlow().catch(console.error);
