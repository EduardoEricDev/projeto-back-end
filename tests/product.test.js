const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { resetDatabase, closeDatabase } = require('./setup');

const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('Produtos (/v1/product) e Documentação Swagger', () => {
  let token;
  let catShoes;
  let catCasual;

  beforeEach(async () => {
    await resetDatabase();

    await request(app).post('/v1/user').send({
      firstname: 'Admin',
      surname: 'Loja',
      email: 'loja@mail.com',
      password: '123@123',
      confirmPassword: '123@123',
    });
    const authRes = await request(app).post('/v1/user/token').send({
      email: 'loja@mail.com',
      password: '123@123',
    });
    token = authRes.body.token;

    const c1 = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    catShoes = c1.body.id;

    const c2 = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Casual', slug: 'casual', use_in_menu: false });
    catCasual = c2.body.id;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('POST /v1/product cria produto com categorias, imagens base64 e opções', async () => {
    const unauth = await request(app).post('/v1/product').send({ name: 'Sem Token' });
    expect(unauth.status).toBe(401);

    const res = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        enabled: true,
        name: 'Tênis Nike Air',
        slug: 'tenis-nike-air',
        stock: 10,
        description: 'Tênis confortável para corrida',
        price: 199.9,
        price_with_discount: 149.9,
        category_ids: [catShoes, catCasual],
        images: [
          { type: 'image/png', content: SAMPLE_PNG_BASE64 },
        ],
        options: [
          {
            title: 'Tamanho',
            shape: 'square',
            radius: '4px',
            type: 'text',
            value: ['PP', 'GG', 'M'],
          },
          {
            title: 'Cor',
            shape: 'circle',
            type: 'color',
            values: ['#000', '#333'],
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.category_ids).toEqual([catShoes, catCasual]);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0].content).toMatch(/^\/media\/.*\.png$/);

    const savedFile = path.join(env.mediaDir, path.basename(res.body.images[0].content));
    expect(fs.existsSync(savedFile)).toBe(true);

    expect(res.body.options).toHaveLength(2);
    expect(res.body.options[0].radius).toBe(4);
    expect(res.body.options[0].values).toEqual(['PP', 'GG', 'M']);
  });

  test('GET /v1/product/search suporta match, category_ids, price-range, option e fields', async () => {
    const p1 = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        enabled: true,
        name: 'Tênis Runner',
        slug: 'tenis-runner',
        stock: 15,
        description: 'Ideal para corrida leve',
        price: 150,
        price_with_discount: 120,
        category_ids: [catShoes],
        images: [{ type: 'image/png', content: SAMPLE_PNG_BASE64 }],
        options: [
          {
            title: 'Tamanho',
            shape: 'square',
            radius: '4px',
            type: 'text',
            values: ['PP', 'GG'],
          },
        ],
      });

    await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        enabled: true,
        name: 'Boné Street',
        slug: 'bone-street',
        stock: 5,
        description: 'Acessório urbano',
        price: 80,
        price_with_discount: 70,
        category_ids: [catCasual],
      });

    const optionId = p1.body.options[0].id;

    const searchRes = await request(app).get(
      `/v1/product/search?match=corrida&category_ids=${catShoes}&price-range=100-200&option[${optionId}]=GG,M&fields=name,images,price`
    );

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.total).toBe(1);
    expect(searchRes.body.data).toHaveLength(1);
    expect(Object.keys(searchRes.body.data[0]).sort()).toEqual(['images', 'name', 'price']);
    expect(searchRes.body.data[0].name).toBe('Tênis Runner');

    const badRange = await request(app).get('/v1/product/search?price-range=200-100');
    expect(badRange.status).toBe(400);
  });

  test('PUT e DELETE /v1/product/:id atualizam e removem imagens, opções e produto', async () => {
    const created = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        enabled: true,
        name: 'Produto Original',
        slug: 'produto-original',
        stock: 10,
        description: 'Desc',
        price: 100,
        price_with_discount: 80,
        category_ids: [catShoes],
        images: [
          { type: 'image/png', content: SAMPLE_PNG_BASE64 },
          { type: 'image/png', content: SAMPLE_PNG_BASE64 },
        ],
        options: [
          { title: 'Tam', shape: 'square', radius: 4, type: 'text', values: ['P', 'M'] },
          { title: 'Cor', shape: 'circle', type: 'color', values: ['#000'] },
        ],
      });

    const prod = created.body;
    const putRes = await request(app)
      .put(`/v1/product/${prod.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto Atualizado',
        price: 90,
        price_with_discount: 0,
        category_ids: [catCasual],
        images: [
          { id: prod.images[0].id, deleted: true },
          { id: prod.images[1].id, content: 'https://store.com/media/updated.jpg' },
        ],
        options: [
          { id: prod.options[0].id, deleted: true },
          { id: prod.options[1].id, radius: '10px', value: ['42/43', '44/45'] },
          { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão'] },
        ],
      });

    expect(putRes.status).toBe(204);

    const updated = await request(app).get(`/v1/product/${prod.id}`);
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Produto Atualizado');
    expect(updated.body.category_ids).toEqual([catCasual]);
    expect(updated.body.images).toEqual([
      { id: prod.images[1].id, content: 'https://store.com/media/updated.jpg' },
    ]);
    expect(updated.body.options).toHaveLength(2);
    expect(updated.body.options[0].radius).toBe(10);
    expect(updated.body.options[0].values).toEqual(['42/43', '44/45']);

    const delRes = await request(app)
      .delete(`/v1/product/${prod.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    const notFound = await request(app).get(`/v1/product/${prod.id}`);
    expect(notFound.status).toBe(404);
  });

  test('GET /api-docs/ deve servir a interface Swagger', async () => {
    const docs = await request(app).get('/api-docs/');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('Swagger UI');
  });
});
