const express = require('express');
const qs = require('qs');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const swaggerDocument = require('./config/swagger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Preserva chaves numéricas como objeto em query strings do tipo option[1]=GG,PP
app.set('query parser', (str) => qs.parse(str, { parseArrays: false }));
app.use(express.json({ limit: '10mb' }));
app.use('/media', express.static(env.mediaDir));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
