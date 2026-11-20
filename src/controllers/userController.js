const userService = require('../services/userService');

async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    await userService.updateUser(req.params.id, req.body);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function token(req, res, next) {
  try {
    const result = await userService.generateToken(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getById,
  create,
  update,
  remove,
  token,
};
