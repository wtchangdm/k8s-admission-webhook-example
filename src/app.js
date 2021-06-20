const { fastify } = require('fastify')

/**
 * Returns a fastify instance. Without port listener attached can make it easier to test.
 *
 * @param {import('fastify').FastifyServerOptions} opts
 */
const build = (opts = {}) => {
  const app = fastify(opts)

  app.register(require('./routes/v1'), { prefix: '/v1' })

  return app
}

module.exports = build
