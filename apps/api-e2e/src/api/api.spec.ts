import { test, expect } from '@playwright/test';

test.describe('Personal Loan Portal API', () => {
  test('database health endpoint responds successfully', async ({ request }) => {
    const response = await request.get(
      'http://localhost:3000/api/health/database',
    );

    expect(response.ok()).toBeTruthy();
    await expect(response).toBeOK();

    const body = await response.json();

    expect(body.status).toBe('connected');
    expect(body.database).toBe('mysql');
  });

  test('register endpoint creates a new customer successfully', async ({ request }) => {
    const email = `e2e.customer.${Date.now()}@example.com`;

    const response = await request.post(
      'http://localhost:3000/api/auth/register',
      {
        data: {
          fullName: 'E2E Test Customer',
          email,
          password: process.env.SEED_CUSTOMER_PASSWORD,
        },
      },
    );

    expect(response.status()).toBe(201);

    const body = await response.json();

    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(email);
    expect(body.user.role.toLowerCase()).toBe('customer');
  });

  test('auth login endpoint responds successfully', async ({ request }) => {
    const response = await request.post(
      'http://localhost:3000/api/auth/login',
      {
        data: {
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('user');
    expect(body.user.role).toBe('ADMIN');
  });

  test('auth login rejects invalid credentials', async ({ request }) => {
    const response = await request.post(
      'http://localhost:3000/api/auth/login',
      {
        data: {
          email: 'nonexistent.user@example.com',
          password: 'WrongPassword123!',
        },
      },
    );

    expect(response.status()).toBe(401);
  });

  test('loan purposes endpoint returns a list successfully', async ({ request }) => {
    const response = await request.get(
      'http://localhost:3000/api/loan-purposes',
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
  });

  test('authenticated customer can fetch their applications', async ({ request }) => {
    const loginResponse = await request.post(
      'http://localhost:3000/api/auth/login',
      {
        data: {
          email: 'seed.customer.001@example.com',
          password: process.env.SEED_CUSTOMER_PASSWORD,
        },
      },
    );

    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    const token = loginBody.accessToken;

    expect(token).toBeTruthy();

    const response = await request.get(
      'http://localhost:3000/api/loan-applications/mine',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
  });

  test('customer cannot access the admin applications endpoint', async ({ request }) => {
    const loginResponse = await request.post(
      'http://localhost:3000/api/auth/login',
      {
        data: {
          email: 'seed.customer.001@example.com',
          password: process.env.SEED_CUSTOMER_PASSWORD,
        },
      },
    );

    expect(loginResponse.status()).toBe(200);

    const { accessToken } = await loginResponse.json();
    expect(accessToken).toBeTruthy();

    const response = await request.get(
      'http://localhost:3000/api/loan-applications',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(403);
  });
});