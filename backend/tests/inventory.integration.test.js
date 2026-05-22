const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { connectTestDB, closeTestDB, clearDB, createUserAndToken } = require('./testUtils');

describe('Inventory API', () => {
  let token;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
    const t = await createUserAndToken({ role: 'Admin' });
    token = t.token;
  });

  afterAll(async () => {
    await closeTestDB();
  });

  afterEach(async () => {
    await clearDB();
    const t = await createUserAndToken({ role: 'Admin' });
    token = t.token;
  });

  test('Create, read, update and delete product', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TST-001', name: 'Test Ring', category: 'Ring', metalType: 'gold_22k', metalWeightGrams: 5.2 });
    expect(createRes.statusCode).toBe(201);
    const prodId = createRes.body._id;

    // Read list
    const listRes = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find(p => p.sku === 'TST-001')).toBeTruthy();

    // Update
    const updRes = await request(app).put(`/api/inventory/${prodId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Updated Ring' });
    expect(updRes.statusCode).toBe(200);
    expect(updRes.body.name).toBe('Updated Ring');

    // Delete
    const delRes = await request(app).delete(`/api/inventory/${prodId}`).set('Authorization', `Bearer ${token}`);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.message).toMatch(/removed/i);
  }, 20000);
});
