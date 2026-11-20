const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/errorMiddleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  };
}

async function getUserById(id) {
  const user = await User.findByPk(id, {
    attributes: ['id', 'firstname', 'surname', 'email'],
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return sanitizeUser(user);
}

async function createUser({ firstname, surname, email, password, confirmPassword }) {
  if (
    typeof firstname !== 'string' || !firstname.trim() ||
    typeof surname !== 'string' || !surname.trim() ||
    typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) ||
    typeof password !== 'string' || !password ||
    typeof confirmPassword !== 'string' || !confirmPassword
  ) {
    throw new AppError('Dados de cadastro inválidos ou incompletos', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('As senhas informadas não conferem', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('Já existe um usuário cadastrado com este e-mail', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstname: firstname.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  return sanitizeUser(user);
}

async function updateUser(id, { firstname, surname, email }) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  if (
    typeof firstname !== 'string' || !firstname.trim() ||
    typeof surname !== 'string' || !surname.trim() ||
    typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())
  ) {
    throw new AppError('Dados inválidos para atualização do usuário', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailOwner = await User.findOne({ where: { email: normalizedEmail } });
  if (emailOwner && emailOwner.id !== user.id) {
    throw new AppError('O e-mail informado já está em uso por outro usuário', 400);
  }

  await user.update({
    firstname: firstname.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
  });
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  await user.destroy();
}

async function generateToken({ email, password }) {
  if (
    typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) ||
    typeof password !== 'string' || !password
  ) {
    throw new AppError('E-mail e senha são obrigatórios', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    throw new AppError('E-mail ou senha inválidos', 400);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError('E-mail ou senha inválidos', 400);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return { token };
}

module.exports = {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  generateToken,
};
