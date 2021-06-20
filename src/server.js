const fs = require('fs')
const app = require('./app')({
  logger: true,
  // Admission wenhook must be executed as https server.
  // Certificates needs to match k8s service domain. (<service>, <service>.ns, <service>.ns.svc.)
  https: {
    cert: fs.readFileSync('/certs/tls.crt'),
    key: fs.readFileSync('/certs/tls.key')
  }
})

const printReqBody = (req, res, done) => {
  req.log.info({ body: req.body }, 'Check full request body here!')
  done()
}

const healthCheck = async function (req, res) {
  // TODO: Implement actual health check
  return { message: 'Health check OK.' }
}

const serve = async () => {
  try {
    const port = 443
    app.addHook('preValidation', printReqBody)

    app.get('/health', healthCheck)
    await app.listen({ host: '0.0.0.0', port: port })
    app.log.info(`Listening on: 0.0.0.0:${port} with PID ${process.pid}.`)
  } catch (error) {
    app.log.error(`Error launching web server: ${error}`)
    process.exit(1)
  }
}

serve()
