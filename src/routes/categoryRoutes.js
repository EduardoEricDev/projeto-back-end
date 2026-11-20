const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// `/search` precisa vir antes de `/:id` para não ser capturado como parâmetro
router.get('/search', categoryController.search);
router.get('/:id', categoryController.getById);
router.post('/', authMiddleware, categoryController.create);
router.put('/:id', authMiddleware, categoryController.update);
router.delete('/:id', authMiddleware, categoryController.remove);

module.exports = router;
