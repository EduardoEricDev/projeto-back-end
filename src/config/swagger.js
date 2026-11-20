const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API E-Commerce - Projeto Back-End',
    version: '1.0.0',
    description:
      'API RESTful para gerenciamento de usuários, categorias, produtos e autenticação JWT.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'Eduardo' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'eduardo@mail.com' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: {
            type: 'array',
            items: { type: 'integer' },
            example: [1, 2],
          },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                content: { type: 'string', example: '/media/image.png' },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { type: 'integer', example: 4 },
                type: { type: 'string', enum: ['text', 'color'] },
                values: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['PP', 'M', 'GG'],
                },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/v1/user/token': {
      post: {
        tags: ['Autenticação'],
        summary: 'Gerar token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'user@mail.com' },
                  password: { type: 'string', example: '123@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token gerado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { token: { type: 'string' } },
                },
              },
            },
          },
          400: { description: 'Credenciais inválidas ou ausentes' },
        },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastrar novo usuário',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
                properties: {
                  firstname: { type: 'string' },
                  surname: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuário criado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          400: { description: 'Dados inválidos' },
        },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Usuários'],
        summary: 'Obter usuário por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          404: { description: 'Usuário não encontrado' },
        },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualizar usuário',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstname', 'surname', 'email'],
                properties: {
                  firstname: { type: 'string' },
                  surname: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          204: { description: 'Atualizado com sucesso' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Usuário não encontrado' },
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Deletar usuário',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removido com sucesso' },
          401: { description: 'Não autorizado' },
          404: { description: 'Usuário não encontrado' },
        },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Listar categorias com filtros e paginação',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'fields', in: 'query', schema: { type: 'string', example: 'name,slug' } },
          { name: 'use_in_menu', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'Lista paginada de categorias' },
          400: { description: 'Parâmetros inválidos' },
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Criar categoria',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  use_in_menu: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoria criada' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
        },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categorias'],
        summary: 'Obter categoria por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          404: { description: 'Categoria não encontrada' },
        },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualizar categoria',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  use_in_menu: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          204: { description: 'Atualizada com sucesso' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Categoria não encontrada' },
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Deletar categoria',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removida com sucesso' },
          401: { description: 'Não autorizado' },
          404: { description: 'Categoria não encontrada' },
        },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar produtos com filtros e paginação',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'fields', in: 'query', schema: { type: 'string', example: 'name,images,price' } },
          { name: 'match', in: 'query', schema: { type: 'string', example: 'Tênis' } },
          { name: 'category_ids', in: 'query', schema: { type: 'string', example: '1,2' } },
          { name: 'price-range', in: 'query', schema: { type: 'string', example: '100-200' } },
        ],
        responses: {
          200: { description: 'Lista paginada de produtos' },
          400: { description: 'Parâmetros inválidos' },
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cadastrar novo produto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        responses: {
          201: { description: 'Produto criado' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
        },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Obter produto por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Produto encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          404: { description: 'Produto não encontrado' },
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualizar produto',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        responses: {
          204: { description: 'Atualizado com sucesso' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Não autorizado' },
          404: { description: 'Produto não encontrado' },
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Deletar produto',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          204: { description: 'Removido com sucesso' },
          401: { description: 'Não autorizado' },
          404: { description: 'Produto não encontrado' },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
