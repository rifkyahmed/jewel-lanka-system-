const request = require('supertest');
const app = require('../server');

describe('Health check', () => {
  test('GET / returns 200 OK', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/Decision Analytics Jewelry JMS API is running/);
  });
});
