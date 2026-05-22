const request = require('supertest');
const app = require('../server');
const Product = require('../models/Product');
const { connectTestDB, closeTestDB, clearDB, createUserAndToken } = require('./testUtils');

describe('Orders API', () => {
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

  test('Checkout creates order and updates product status and returns PDF', async () => {
    // create product
    const prodRes = await request(app).post('/api/inventory').set('Authorization', `Bearer ${token}`).send({ sku: 'ORD-01', name: 'Gold Necklace', category: 'Necklace', metalType: 'gold_22k', metalWeightGrams: 10 });
    expect(prodRes.statusCode).toBe(201);

    // checkout
    const checkoutRes = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ items: [{ sku: 'ORD-01' }], paymentMethod: 'Cash' });
    expect(checkoutRes.statusCode).toBe(201);
    const invoice = checkoutRes.body.invoiceNumber;

    // product should be sold
    const prod = await Product.findOne({ sku: 'ORD-01' });
    expect(prod.status).toBe('Sold');

    // get orders list
    const listRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    // PDF
    const pdfRes = await request(app).get(`/api/orders/${invoice}/pdf`).set('Authorization', `Bearer ${token}`);
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);
  }, 30000);

  test('PDF download works with query token for direct browser navigation', async () => {
    const prodRes = await request(app).post('/api/inventory').set('Authorization', `Bearer ${token}`).send({ sku: 'ORD-02', name: 'Gold Ring', category: 'Ring', metalType: 'gold_22k', metalWeightGrams: 5 });
    expect(prodRes.statusCode).toBe(201);

    const checkoutRes = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ items: [{ sku: 'ORD-02' }], paymentMethod: 'Cash' });
    expect(checkoutRes.statusCode).toBe(201);

    const invoice = checkoutRes.body.invoiceNumber;
    const pdfRes = await request(app).get(`/api/orders/${invoice}/pdf`).query({ token, template: 'classic' });
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfRes.headers['content-disposition']).toMatch(/attachment/);
  }, 30000);
});
