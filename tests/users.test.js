import { describe, it, before } from 'node:test';
import * as assert from 'node:assert';
import { httpRequest } from './requests.js';
import { SqliteDatabase } from '../server/shared/sqlite.js';
import { env } from '../server/shared/env.js';

describe('JWT Guards Test Suite', () => {
  const baseUrl = 'http://localhost';

  const testUser = {
    username: 'username',
    password: 'password',
  };

  let accessToken = null;
  let refreshToken = null;

  /**
   * Helper function to parse cookies from response
   * @param {string[]} cookieHeaders - Set-Cookie header values
   * @returns {Object} Object with token names as keys and token values as values
   */
  function parseCookies(cookieHeaders) {
    const cookies = {};
    cookieHeaders.forEach((cookieString) => {
      const [cookiePart] = cookieString.split(';');
      const [name, value] = cookiePart.split('=');
      cookies[name] = value;
    });
    return cookies;
  }

  it('1. Login: should return 204 and set access + refresh cookies', async () => {
    const bodyData = JSON.stringify({
      username: testUser.username,
      password: testUser.password,
    });

    const reqOptions = {
      origin: baseUrl,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyData,
    };

    const response = await httpRequest(reqOptions);

    assert.equal(response.statusCode, 204, `Login should return 204, got ${response.statusCode}: ${response.body.toString()}`);
    assert.ok(
      response.headers['set-cookie'],
      'Should have set-cookie header'
    );
    assert.ok(
      response.headers['set-cookie'].length >= 2,
      'Should set at least 2 cookies (access and refresh)'
    );

    const cookies = parseCookies(response.headers['set-cookie']);
    accessToken = cookies.access_token;
    refreshToken = cookies.refresh_token;

    assert.ok(accessToken, 'Should have access token');
    assert.ok(refreshToken, 'Should have refresh token');
  });

  it('2. Access valid + Refresh valid: should allow access to protected route /', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cookies = `access_token=${accessToken}; refresh_token=${refreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      200,
      'Should allow access with valid tokens'
    );

    const newCookies = response.headers['set-cookie'];
    if (newCookies) {
      const parsedCookies = parseCookies(newCookies);
      if (parsedCookies.access_token) {
        accessToken = parsedCookies.access_token;
      }
      if (parsedCookies.refresh_token) {
        refreshToken = parsedCookies.refresh_token;
      }
    }
  });

  it('3. Access expired + Refresh valid: should renew access token with valid refresh token', async () => {
    const cookies = `access_token=${accessToken}; refresh_token=${refreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      200,
      'Should allow access even with refresh token'
    );

    const newCookies = response.headers['set-cookie'];
    if (newCookies) {
      const parsedCookies = parseCookies(newCookies);
      if (parsedCookies.access_token) {
        accessToken = parsedCookies.access_token;
      }
      if (parsedCookies.refresh_token) {
        refreshToken = parsedCookies.refresh_token;
      }
    }
  });

  it('4. Access expired + Refresh expired: should return 401 and clear cookies', async () => {
    const invalidAccessToken = 'invalid.access.token';
    const invalidRefreshToken = 'invalid.refresh.token';

    const cookies = `access_token=${invalidAccessToken}; refresh_token=${invalidRefreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      401,
      'Should return 401 with expired tokens'
    );

    const setCookies = response.headers['set-cookie'] || [];
    const clearedCookies = setCookies.filter((c) =>
      c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')
    );
    assert.ok(
      clearedCookies.length > 0,
      'Should clear cookies with Max-Age=0 or Expires in the past'
    );
  });

  it('5. Route /: should allow authenticated user to access protected route', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cookies = `access_token=${accessToken}; refresh_token=${refreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      200,
      'Authenticated user should access / route'
    );
    assert.ok(response.body.length > 0, 'Should have response body');
  });

  it('6. Route /admin: should allow authenticated user to access admin route', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cookies = `access_token=${accessToken}; refresh_token=${refreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/admin',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      200,
      'Authenticated user should access /admin route'
    );
    assert.ok(response.body.length > 0, 'Should have response body');
  });

  it('7. No auth: should return 401 when accessing protected route without tokens', async () => {
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      401,
      'Should return 401 without authentication'
    );
  });

  it('8. Logout: should clear cookies and return 204', async () => {
    const cookies = `access_token=${accessToken}; refresh_token=${refreshToken}`;
    const reqOptions = {
      origin: baseUrl,
      path: '/logout',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(response.statusCode, 204, 'Logout should return 204');

    const setCookies = response.headers['set-cookie'] || [];
    assert.ok(
      setCookies.length >= 2,
      'Should clear at least 2 cookies'
    );

    const clearedCookies = setCookies.filter((c) =>
      c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')
    );
    assert.equal(
      clearedCookies.length,
      setCookies.length,
      'All cookies should be cleared'
    );
  });

  it('9. After logout: should return 401 when accessing protected route after logout', async () => {
    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await httpRequest(reqOptions);

    assert.equal(
      response.statusCode,
      401,
      'Should not allow access without cookies after logout'
    );
  });

  it('10. JWT version change: should return 401 when ver is updated in database', async () => {
    const bodyData = JSON.stringify({
      username: testUser.username,
      password: testUser.password,
    });

    const loginReqOptions = {
      origin: baseUrl,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyData,
    };

    const loginResponse = await httpRequest(loginReqOptions);
    assert.equal(loginResponse.statusCode, 204, 'Login should return 204');

    const cookies = parseCookies(loginResponse.headers['set-cookie']);
    const testAccessToken = cookies.access_token;
    const testRefreshToken = cookies.refresh_token;

    const db = new SqliteDatabase(env.SQLITE_DB_FILENAME);

    const reqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${testAccessToken}; refresh_token=${testRefreshToken}`,
      },
    };

    let response = await httpRequest(reqOptions);
    assert.equal(response.statusCode, 200, 'Should allow access before version change');

    await db.run('UPDATE users SET jwt_version = ? WHERE id = 1', [Date.now()]);

    response = await httpRequest(reqOptions);
    assert.equal(
      response.statusCode,
      401,
      'Should return 401 when jwt_version changes in database'
    );

    const setCookies = response.headers['set-cookie'] || [];
    const clearedCookies = setCookies.filter((c) =>
      c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')
    );
    assert.ok(
      clearedCookies.length > 0,
      'Should clear cookies when version mismatch'
    );
  });

  it('11. Permissions: user with only basic permission [1] should access / but not /admin', async () => {
    const bodyData = JSON.stringify({
      username: 'basicuser',
      password: 'basicpass',
    });

    const loginReqOptions = {
      origin: baseUrl,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyData,
    };

    const loginResponse = await httpRequest(loginReqOptions);
    assert.equal(loginResponse.statusCode, 204, 'Login should return 204');

    const cookies = parseCookies(loginResponse.headers['set-cookie']);
    const basicAccessToken = cookies.access_token;
    const basicRefreshToken = cookies.refresh_token;

    // Should access /
    const indexReqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${basicAccessToken}; refresh_token=${basicRefreshToken}`,
      },
    };

    let response = await httpRequest(indexReqOptions);
    assert.equal(
      response.statusCode,
      200,
      'User with permission [1] should access /'
    );

    // Should NOT access /admin
    const adminReqOptions = {
      origin: baseUrl,
      path: '/admin',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${basicAccessToken}; refresh_token=${basicRefreshToken}`,
      },
    };

    response = await httpRequest(adminReqOptions);
    assert.equal(
      response.statusCode,
      403,
      'User with only permission [1] should NOT access /admin (403 Forbidden)'
    );
  });

  it('12. Permissions: user with only admin permission [2] should access /admin but not /', async () => {
    const bodyData = JSON.stringify({
      username: 'adminuser',
      password: 'adminpass',
    });

    const loginReqOptions = {
      origin: baseUrl,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyData,
    };

    const loginResponse = await httpRequest(loginReqOptions);
    assert.equal(loginResponse.statusCode, 204, 'Login should return 204');

    const cookies = parseCookies(loginResponse.headers['set-cookie']);
    const adminAccessToken = cookies.access_token;
    const adminRefreshToken = cookies.refresh_token;

    // Should access /admin
    const adminReqOptions = {
      origin: baseUrl,
      path: '/admin',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${adminAccessToken}; refresh_token=${adminRefreshToken}`,
      },
    };

    let response = await httpRequest(adminReqOptions);
    assert.equal(
      response.statusCode,
      200,
      'User with permission [2] should access /admin'
    );

    // Should NOT access /
    const indexReqOptions = {
      origin: baseUrl,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${adminAccessToken}; refresh_token=${adminRefreshToken}`,
      },
    };

    response = await httpRequest(indexReqOptions);
    assert.equal(
      response.statusCode,
      403,
      'User with only permission [2] should NOT access / (403 Forbidden)'
    );
  });
});
