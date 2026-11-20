const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, closeDatabase } = require('./setup');

describe('Categorias (/v1/category)', () => {
  let token;

  beforeEach(async () => {
    await resetDatabase();
    await request(app).post('/v1/user').send({
      firstname: 'Admin',
      surname: 'Teste',
      email: 'admin@mail.com',
      password: '123@123',
      confirmPassword: '123@123',
    });
    const authRes = await request(app).post('/v1/user/token').send({
      email: 'admin@mail.com',
      password: '123@123',
    });
    token = authRes.body.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('POST /v1/category exige autenticação e cria categoria válida', async () => {
    const unauth = await request(app)
      .post('/v1/category')
      .send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    expect(unauth.status).toBe(401);

    const invalid = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Shoes',
      slug: 'shoes',
      use_in_menu: true,
    });
  });

  test('GET /v1/category/search suporta limit, page, fields e use_in_menu', async () => {
    const categories = [
      { name: 'Shoes', slug: 'shoes', use_in_menu: true },
      { name: 'Offers', slug: 'offers', use_in_menu: true },
      { name: 'Black Friday', slug: 'black-friday', use_in_menu: false },
    ];

    for (const cat of categories) {
      await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send(cat);
    }

    const all = await request(app).get('/v1/category/search?limit=-1');
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);
    expect(all.body.limit).toBe(-1);
    expect(all.body.data).toHaveLength(3);

    const filtered = await request(app).get(
      '/v1/category/search?use_in_menu=true&fields=name,slug&limit=1&page=2'
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual({
      data: [{ name: 'Offers', slug: 'offers' }],
      total: 2,
      limit: 1,
      page: 2,
    });

    const badQuery = await request(app).get('/v1/category/search?limit=0');
    expect(badQuery.status).toBe(400);
  });

  test('GET, PUT e DELETE /v1/category/:id funcionam conforme especificação', async () => {
    const created = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    const id = created.body.id;

    const getRes = await request(app).get(`/v1/category/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Shoes');

    const get404 = await request(app).get('/v1/category/999');
    expect(get404.status).toBe(404);

    const putRes = await request(app)
      .put(`/v1/category/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sneakers', slug: 'sneakers', use_in_menu: false });
    expect(putRes.status).toBe(204);

    const delRes = await request(app)
      .delete(`/v1/category/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    const del404 = await request(app)
      .delete(`/v1/category/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del404.status).toBe(404);
  });
});
