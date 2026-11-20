const productService = require('../services/productService');

async function search(req, res, next) {
  try {
    const result = await productService.searchProducts(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    await productService.updateProduct(req.params.id, req.body);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove,
};
