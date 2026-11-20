const { Category } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

// Garante boolean nativo em use_in_menu independente do dialeto do banco
function formatCategory(category, selectedFields = null) {
  const plain = category.get({ plain: true });
  if (Object.prototype.hasOwnProperty.call(plain, 'use_in_menu')) {
    plain.use_in_menu = Boolean(plain.use_in_menu);
  }

  if (!selectedFields) {
    return {
      id: plain.id,
      name: plain.name,
      slug: plain.slug,
      use_in_menu: Boolean(plain.use_in_menu),
    };
  }

  const filtered = {};
  for (const field of selectedFields) {
    filtered[field] = plain[field];
  }
  return filtered;
}

async function searchCategories(query) {
  const rawLimit = query.limit !== undefined ? Number(query.limit) : 12;
  if (!Number.isInteger(rawLimit) || (rawLimit !== -1 && rawLimit < 1)) {
    throw new AppError('Parâmetro limit inválido', 400);
  }

  const rawPage = query.page !== undefined ? Number(query.page) : 1;
  if (rawLimit !== -1 && (!Number.isInteger(rawPage) || rawPage < 1)) {
    throw new AppError('Parâmetro page inválido', 400);
  }

  let selectedFields = null;
  if (query.fields !== undefined) {
    const requested = String(query.fields)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      requested.length === 0 ||
      requested.some((field) => !ALLOWED_FIELDS.includes(field))
    ) {
      throw new AppError('Parâmetro fields inválido', 400);
    }
    selectedFields = requested;
  }

  const where = {};
  if (query.use_in_menu !== undefined) {
    if (query.use_in_menu === 'true') {
      where.use_in_menu = true;
    } else if (query.use_in_menu === 'false') {
      where.use_in_menu = false;
    } else {
      throw new AppError('Parâmetro use_in_menu inválido', 400);
    }
  }

  const findOptions = {
    where,
    attributes: selectedFields || ALLOWED_FIELDS,
    order: [['id', 'ASC']],
  };

  if (rawLimit !== -1) {
    findOptions.limit = rawLimit;
    findOptions.offset = (rawPage - 1) * rawLimit;
  }

  const { count, rows } = await Category.findAndCountAll(findOptions);

  return {
    data: rows.map((row) => formatCategory(row, selectedFields)),
    total: count,
    limit: rawLimit,
    page: rawLimit === -1 ? 1 : rawPage,
  };
}

async function getCategoryById(id) {
  const category = await Category.findByPk(id, {
    attributes: ALLOWED_FIELDS,
  });

  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  return formatCategory(category);
}

async function createCategory({ name, slug, use_in_menu = false }) {
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof slug !== 'string' || !slug.trim() ||
    (use_in_menu !== undefined && typeof use_in_menu !== 'boolean')
  ) {
    throw new AppError('Dados inválidos para cadastro de categoria', 400);
  }

  const category = await Category.create({
    name: name.trim(),
    slug: slug.trim(),
    use_in_menu: Boolean(use_in_menu),
  });

  return formatCategory(category);
}

async function updateCategory(id, { name, slug, use_in_menu }) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof slug !== 'string' || !slug.trim() ||
    (use_in_menu !== undefined && typeof use_in_menu !== 'boolean')
  ) {
    throw new AppError('Dados inválidos para atualização da categoria', 400);
  }

  await category.update({
    name: name.trim(),
    slug: slug.trim(),
    use_in_menu:
      use_in_menu !== undefined ? use_in_menu : category.use_in_menu,
  });
}

async function deleteCategory(id) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  await category.destroy();
}

module.exports = {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
