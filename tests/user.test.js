const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { User } = require('../src/models');
const { resetDatabase, closeDatabase } = require('./setup');

describe('Usuários e Autenticação JWT (/v1/user)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const validUser = {
    firstname: 'Eduardo',
    surname: 'Silva',
    email: 'eduardo@mail.com',
    password: '123@123',
    confirmPassword: '123@123',
  };

  test('POST /v1/user deve criar usuário com senha criptografada em bcrypt', async () => {
    const res = await request(app).post('/v1/user').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      firstname: 'Eduardo',
      surname: 'Silva',
      email: 'eduardo@mail.com',
    });
    expect(res.body.password).toBeUndefined();

    const saved = await User.findByPk(1);
    expect(saved.password).not.toBe(validUser.password);
    expect(await bcrypt.compare(validUser.password, saved.password)).toBe(true);
  });

  test('POST /v1/user deve retornar 400 se senhas divergirem ou e-mail já existir', async () => {
    const mismatch = await request(app)
      .post('/v1/user')
      .send({ ...validUser, confirmPassword: 'outra' });
    expect(mismatch.status).toBe(400);

    await request(app).post('/v1/user').send(validUser);
    const duplicate = await request(app).post('/v1/user').send(validUser);
    expect(duplicate.status).toBe(400);
  });

  test('GET /v1/user/:id deve retornar usuário ou 404 quando não encontrado', async () => {
    await request(app).post('/v1/user').send(validUser);

    const found = await request(app).get('/v1/user/1');
    expect(found.status).toBe(200);
    expect(found.body).toEqual({
      id: 1,
      firstname: 'Eduardo',
      surname: 'Silva',
      email: 'eduardo@mail.com',
    });

    const notFound = await request(app).get('/v1/user/999');
    expect(notFound.status).toBe(404);
  });

  test('POST /v1/user/token deve gerar JWT válido ou retornar 400 para credenciais inválidas', async () => {
    await request(app).post('/v1/user').send(validUser);

    const ok = await request(app)
      .post('/v1/user/token')
      .send({ email: validUser.email, password: validUser.password });

    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe('string');

    const badPass = await request(app)
      .post('/v1/user/token')
      .send({ email: validUser.email, password: 'errada' });
    expect(badPass.status).toBe(400);
  });

  test('PUT e DELETE /v1/user/:id exigem token JWT e validam existência/dados', async () => {
    await request(app).post('/v1/user').send(validUser);

    const noAuthPut = await request(app).put('/v1/user/1').send({
      firstname: 'Novo',
      surname: 'Nome',
      email: 'novo@mail.com',
    });
    expect(noAuthPut.status).toBe(401);

    const login = await request(app)
      .post('/v1/user/token')
      .send({ email: validUser.email, password: validUser.password });
    const token = login.body.token;

    const badPut = await request(app)
      .put('/v1/user/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstname: '', surname: 'Nome', email: 'invalido' });
    expect(badPut.status).toBe(400);

    const okPut = await request(app)
      .put('/v1/user/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstname: 'Carlos', surname: 'Souza', email: 'carlos@mail.com' });
    expect(okPut.status).toBe(204);
    expect(okPut.text).toBe('');

    const notFoundPut = await request(app)
      .put('/v1/user/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstname: 'Carlos', surname: 'Souza', email: 'carlos@mail.com' });
    expect(notFoundPut.status).toBe(404);

    const okDelete = await request(app)
      .delete('/v1/user/1')
      .set('Authorization', `Bearer ${token}`);
    expect(okDelete.status).toBe(204);

    const notFoundDelete = await request(app)
      .delete('/v1/user/1')
      .set('Authorization', `Bearer ${token}`);
    expect(notFoundDelete.status).toBe(404);
  });
});
