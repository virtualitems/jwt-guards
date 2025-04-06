// https://nodejs.org/docs/latest-v21.x/api/test.html

import { describe, it, skip } from 'node:test';

import * as assert from 'node:assert';

import { httpRequest } from './requests.js';

describe('Users test suite', () => {
  const baseUrl = 'http://localhost';

  const user = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: '123456',
  };

  let cookies = [];

  it('should create a user', async () => {
    // Arrange
    const reqOptions = {
      origin: baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    };

    // Act
    const response = await httpRequest(reqOptions);

    // Assert
    assert.equal(response.statusCode, 201);
  });

  it('login with user credentials', async () => {
    // Arrange
    const reqOptions = {
      origin: baseUrl,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    };

    // Act
    const response = await httpRequest(reqOptions);

    // Assert
    assert.equal(response.statusCode, 200);
    assert.notEqual(response.headers['set-cookie'].length, 0);

    cookies = response.headers['set-cookie'];
  });

  it('should list all users', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for different jwt timestamps

    // Arrange
    const reqOptions = {
      origin: baseUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
    };

    // Act
    const { statusCode, headers, body } = await httpRequest(reqOptions);
    let json = null;

    try {
      json = JSON.parse(body.toString('utf8'));
    } catch (e) {
      throw new Error('Error parsing JSON');
    }

    // Assert
    assert.equal(statusCode, 200);
    assert.ok(headers['content-type'].includes('application/json'));
    assert.ok(body.length > 0, 'Response body is empty');
    assert.ok(Array.isArray(json), 'Response body is not an array');
    assert.ok(json.length > 0, 'Response body does not contain users');
    assert.ok(cookies[0] !== headers['set-cookie'][0], 'Cookies should be different');
    assert.equal(json[0].name, user.name);
  });
});
