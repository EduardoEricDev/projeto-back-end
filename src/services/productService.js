const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models');
const env = require('../config/env');
const { AppError } = require('../middleware/errorMiddleware');

const ALLOWED_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'use_in_menu',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
];

const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Converte valores como "4px" ou 4 para inteiro
function parseRadius(radius) {
  if (radius === undefined || radius === null) {
    return 0;
  }

  const parsed =
    typeof radius === 'string'
      ? parseInt(radius.replace(/px$/i, '').trim(), 10)
      : Number(radius);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError('Valor de radius inválido na opção do produto', 400);
  }

  return parsed;
}

// Aceita `values` ou `value` (array ou string separada por vírgula)
function normalizeOptionValues(option) {
  const raw = option.values !== undefined ? option.values : option.value;

  if (Array.isArray(raw)) {
    const items = raw.map((item) => String(item).trim()).filter(Boolean);
    if (items.length === 0) {
      throw new AppError('A opção do produto precisa conter ao menos um valor', 400);
    }
    return items.join(',');
  }

  if (typeof raw === 'string' && raw.trim()) {
    const items = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) {
      throw new AppError('A opção do produto precisa conter ao menos um valor', 400);
    }
    return items.join(',');
  }

  throw new AppError('Campo values da opção do produto é obrigatório', 400);
}

// Salva imagem base64 no diretório local de mídia ou mantém URL/caminho direto
function resolveImagePath(imageInput) {
  const { type, content } = imageInput;

  if (typeof content !== 'string' || !content.trim()) {
    throw new AppError('Conteúdo da imagem é obrigatório', 400);
  }

  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/media/')) {
    return trimmed;
  }

  let mimeType = type;
  let base64Data = trimmed;

  const dataUriMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUriMatch) {
    mimeType = mimeType || dataUriMatch[1];
    base64Data = dataUriMatch[2];
  }

  const ext = MIME_TO_EXT[mimeType] || 'png';
  fs.mkdirSync(env.mediaDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const fullPath = path.join(env.mediaDir, fileName);
  fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));

  return `/media/${fileName}`;
}

function removeLocalImageIfExists(imagePath) {
  if (!imagePath || !imagePath.startsWith('/media/')) {
    return;
  }
  const fileName = path.basename(imagePath);
  const fullPath = path.join(env.mediaDir, fileName);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function formatProduct(product, selectedFields = null) {
  const plain = product.get({ plain: true });

  const formatted = {
    id: plain.id,
    enabled: Boolean(plain.enabled),
    name: plain.name,
    slug: plain.slug,
    use_in_menu: Boolean(plain.use_in_menu),
    stock: plain.stock,
    description: plain.description,
    price: plain.price,
    price_with_discount: plain.price_with_discount,
    category_ids: (plain.categories || []).map((cat) => cat.id),
    images: (plain.images || []).map((img) => ({
      id: img.id,
      content: img.path,
    })),
    options: (plain.options || []).map((opt) => ({
      id: opt.id,
      title: opt.title,
      shape: opt.shape,
      radius: opt.radius,
      type: opt.type,
      values: opt.values ? opt.values.split(',') : [],
    })),
  };

  if (!selectedFields) {
    return formatted;
  }

  const filtered = {};
  for (const field of selectedFields) {
    filtered[field] = formatted[field];
  }
  return filtered;
}

async function validateCategoryIds(categoryIds, transaction) {
  if (!Array.isArray(categoryIds)) {
    throw new AppError('category_ids deve ser um array de IDs', 400);
  }

  const normalized = categoryIds.map((id) => Number(id));
  if (normalized.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new AppError('category_ids contém IDs inválidos', 400);
  }

  const uniqueIds = [...new Set(normalized)];
  if (uniqueIds.length === 0) {
    return uniqueIds;
  }

  const count = await Category.count({
    where: { id: { [Op.in]: uniqueIds } },
    transaction,
  });

  if (count !== uniqueIds.length) {
    throw new AppError('Uma ou mais categorias informadas não existem', 400);
  }

  return uniqueIds;
}

async function searchProducts(query) {
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
      .map((field) => field.trim())
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

  if (query.match !== undefined && String(query.match).trim() !== '') {
    const term = `%${String(query.match).trim().toLowerCase()}%`;
    where[Op.or] = [
      sqlWhere(fn('LOWER', col('Product.name')), { [Op.like]: term }),
      sqlWhere(fn('LOWER', col('Product.description')), { [Op.like]: term }),
    ];
  }

  if (query['price-range'] !== undefined) {
    const parts = String(query['price-range']).split('-');
    if (parts.length !== 2) {
      throw new AppError('Parâmetro price-range deve seguir o formato min-max', 400);
    }
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (
      parts[0].trim() === '' ||
      parts[1].trim() === '' ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      min > max
    ) {
      throw new AppError('Intervalo de preços inválido em price-range', 400);
    }
    where.price = { [Op.between]: [min, max] };
  }

  // Pré-filtragem por IDs garante total e paginação corretos nas associações N:N e 1:N
  let constrainedProductIds = null;

  if (query.category_ids !== undefined) {
    const categoryIds = String(query.category_ids)
      .split(',')
      .map((id) => Number(id.trim()));

    if (
      categoryIds.length === 0 ||
      categoryIds.some((id) => !Number.isInteger(id) || id < 1)
    ) {
      throw new AppError('Parâmetro category_ids inválido', 400);
    }

    const links = await ProductCategory.findAll({
      where: { category_id: { [Op.in]: categoryIds } },
      attributes: ['product_id'],
    });
    constrainedProductIds = new Set(links.map((link) => link.product_id));
  }

  if (query.option !== undefined) {
    if (query.option === null || typeof query.option !== 'object') {
      throw new AppError('Parâmetro option inválido', 400);
    }

    for (const [optionIdRaw, valuesRaw] of Object.entries(query.option)) {
      const optionId = Number(optionIdRaw);
      if (!Number.isInteger(optionId) || optionId < 1) {
        throw new AppError('ID de opção inválido no filtro option', 400);
      }

      const targetValues = String(valuesRaw)
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

      if (targetValues.length === 0) {
        throw new AppError('Valores inválidos no filtro option', 400);
      }

      const matchingOptions = await ProductOption.findAll({
        where: { id: optionId },
        attributes: ['product_id', 'values'],
      });

      const matchedIds = new Set(
        matchingOptions
          .filter((opt) => {
            const available = opt.values
              .split(',')
              .map((v) => v.trim().toLowerCase());
            return targetValues.some((val) => available.includes(val));
          })
          .map((opt) => opt.product_id)
      );

      if (constrainedProductIds === null) {
        constrainedProductIds = matchedIds;
      } else {
        constrainedProductIds = new Set(
          [...constrainedProductIds].filter((id) => matchedIds.has(id))
        );
      }
    }
  }

  if (constrainedProductIds !== null) {
    where.id = { [Op.in]: [...constrainedProductIds] };
  }

  const findOptions = {
    where,
    include: [
      { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
      { model: ProductImage, as: 'images', attributes: ['id', 'path'] },
      { model: ProductOption, as: 'options' },
    ],
    distinct: true,
    order: [
      ['id', 'ASC'],
      [{ model: ProductImage, as: 'images' }, 'id', 'ASC'],
      [{ model: ProductOption, as: 'options' }, 'id', 'ASC'],
    ],
  };

  if (rawLimit !== -1) {
    findOptions.limit = rawLimit;
    findOptions.offset = (rawPage - 1) * rawLimit;
  }

  const { count, rows } = await Product.findAndCountAll(findOptions);

  return {
    data: rows.map((row) => formatProduct(row, selectedFields)),
    total: count,
    limit: rawLimit,
    page: rawLimit === -1 ? 1 : rawPage,
  };
}

async function getProductById(id) {
  const product = await Product.findByPk(id, {
    include: [
      { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
      { model: ProductImage, as: 'images', attributes: ['id', 'path'] },
      { model: ProductOption, as: 'options' },
    ],
    order: [
      [{ model: ProductImage, as: 'images' }, 'id', 'ASC'],
      [{ model: ProductOption, as: 'options' }, 'id', 'ASC'],
    ],
  });

  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  return formatProduct(product);
}

function validateOptionPayload(option) {
  if (typeof option.title !== 'string' || !option.title.trim()) {
    throw new AppError('Título da opção do produto é obrigatório', 400);
  }
  if (option.shape !== undefined && !['square', 'circle'].includes(option.shape)) {
    throw new AppError('Shape da opção deve ser square ou circle', 400);
  }
  if (option.type !== undefined && !['text', 'color'].includes(option.type)) {
    throw new AppError('Type da opção deve ser text ou color', 400);
  }
}

// Transação garante atomicidade entre produto, categorias, imagens e opções
async function createProduct(payload) {
  const {
    enabled = false,
    name,
    slug,
    use_in_menu = false,
    stock = 0,
    description = null,
    price,
    price_with_discount,
    category_ids = [],
    images = [],
    options = [],
  } = payload;

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof slug !== 'string' || !slug.trim() ||
    typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
    typeof price_with_discount !== 'number' || !Number.isFinite(price_with_discount) || price_with_discount < 0 ||
    (stock !== undefined && (!Number.isInteger(stock) || stock < 0))
  ) {
    throw new AppError('Dados obrigatórios do produto inválidos ou ausentes', 400);
  }

  const createdId = await sequelize.transaction(async (transaction) => {
    const validCategoryIds = await validateCategoryIds(category_ids, transaction);

    const product = await Product.create(
      {
        enabled: Boolean(enabled),
        name: name.trim(),
        slug: slug.trim(),
        use_in_menu: Boolean(use_in_menu),
        stock,
        description,
        price,
        price_with_discount,
      },
      { transaction }
    );

    if (validCategoryIds.length > 0) {
      await product.setCategories(validCategoryIds, { transaction });
    }

    if (!Array.isArray(images)) {
      throw new AppError('Campo images deve ser um array', 400);
    }

    for (const img of images) {
      const savedPath = resolveImagePath(img);
      await ProductImage.create(
        {
          product_id: product.id,
          enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
          path: savedPath,
        },
        { transaction }
      );
    }

    if (!Array.isArray(options)) {
      throw new AppError('Campo options deve ser um array', 400);
    }

    for (const opt of options) {
      validateOptionPayload(opt);
      await ProductOption.create(
        {
          product_id: product.id,
          title: opt.title.trim(),
          shape: opt.shape || 'square',
          radius: parseRadius(opt.radius),
          type: opt.type || 'text',
          values: normalizeOptionValues(opt),
        },
        { transaction }
      );
    }

    return product.id;
  });

  return getProductById(createdId);
}

async function updateProduct(id, payload) {
  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  const {
    enabled,
    name,
    slug,
    use_in_menu,
    stock,
    description,
    price,
    price_with_discount,
    category_ids,
    images,
    options,
  } = payload;

  if (
    (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
    (slug !== undefined && (typeof slug !== 'string' || !slug.trim())) ||
    (price !== undefined && (typeof price !== 'number' || !Number.isFinite(price) || price < 0)) ||
    (price_with_discount !== undefined &&
      (typeof price_with_discount !== 'number' || !Number.isFinite(price_with_discount) || price_with_discount < 0)) ||
    (stock !== undefined && (!Number.isInteger(stock) || stock < 0))
  ) {
    throw new AppError('Dados inválidos para atualização do produto', 400);
  }

  await sequelize.transaction(async (transaction) => {
    await product.update(
      {
        enabled: enabled !== undefined ? Boolean(enabled) : product.enabled,
        name: name !== undefined ? name.trim() : product.name,
        slug: slug !== undefined ? slug.trim() : product.slug,
        use_in_menu:
          use_in_menu !== undefined ? Boolean(use_in_menu) : product.use_in_menu,
        stock: stock !== undefined ? stock : product.stock,
        description: description !== undefined ? description : product.description,
        price: price !== undefined ? price : product.price,
        price_with_discount:
          price_with_discount !== undefined
            ? price_with_discount
            : product.price_with_discount,
      },
      { transaction }
    );

    if (category_ids !== undefined) {
      const validCategoryIds = await validateCategoryIds(category_ids, transaction);
      await product.setCategories(validCategoryIds, { transaction });
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        throw new AppError('Campo images deve ser um array', 400);
      }

      for (const img of images) {
        if (img.id && img.deleted) {
          const existingImg = await ProductImage.findOne({
            where: { id: img.id, product_id: product.id },
            transaction,
          });
          if (existingImg) {
            removeLocalImageIfExists(existingImg.path);
            await existingImg.destroy({ transaction });
          }
        } else if (img.id) {
          const existingImg = await ProductImage.findOne({
            where: { id: img.id, product_id: product.id },
            transaction,
          });
          if (!existingImg) {
            throw new AppError(`Imagem ${img.id} não pertence a este produto`, 400);
          }
          const newPath = resolveImagePath(img);
          removeLocalImageIfExists(existingImg.path);
          await existingImg.update({ path: newPath }, { transaction });
        } else {
          const savedPath = resolveImagePath(img);
          await ProductImage.create(
            {
              product_id: product.id,
              enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
              path: savedPath,
            },
            { transaction }
          );
        }
      }
    }

    if (options !== undefined) {
      if (!Array.isArray(options)) {
        throw new AppError('Campo options deve ser um array', 400);
      }

      for (const opt of options) {
        if (opt.id && opt.deleted) {
          await ProductOption.destroy({
            where: { id: opt.id, product_id: product.id },
            transaction,
          });
        } else if (opt.id) {
          const existingOpt = await ProductOption.findOne({
            where: { id: opt.id, product_id: product.id },
            transaction,
          });
          if (!existingOpt) {
            throw new AppError(`Opção ${opt.id} não pertence a este produto`, 400);
          }
          if (opt.shape !== undefined && !['square', 'circle'].includes(opt.shape)) {
            throw new AppError('Shape da opção deve ser square ou circle', 400);
          }
          if (opt.type !== undefined && !['text', 'color'].includes(opt.type)) {
            throw new AppError('Type da opção deve ser text ou color', 400);
          }

          const hasValues = opt.values !== undefined || opt.value !== undefined;
          await existingOpt.update(
            {
              title: opt.title !== undefined ? String(opt.title).trim() : existingOpt.title,
              shape: opt.shape !== undefined ? opt.shape : existingOpt.shape,
              radius: opt.radius !== undefined ? parseRadius(opt.radius) : existingOpt.radius,
              type: opt.type !== undefined ? opt.type : existingOpt.type,
              values: hasValues ? normalizeOptionValues(opt) : existingOpt.values,
            },
            { transaction }
          );
        } else {
          validateOptionPayload(opt);
          await ProductOption.create(
            {
              product_id: product.id,
              title: opt.title.trim(),
              shape: opt.shape || 'square',
              radius: parseRadius(opt.radius),
              type: opt.type || 'text',
              values: normalizeOptionValues(opt),
            },
            { transaction }
          );
        }
      }
    }
  });
}

async function deleteProduct(id) {
  const product = await Product.findByPk(id, {
    include: [{ model: ProductImage, as: 'images' }],
  });

  if (!product) {
    throw new AppError('Produto não encontrado', 404);
  }

  for (const img of product.images || []) {
    removeLocalImageIfExists(img.path);
  }

  await product.destroy();
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
