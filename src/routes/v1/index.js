const fastifyHooks = require('../../libs/hooks')
const k8sAdmissionReviewHelper = require('../../libs/admission_review_helper')

/**
 * Mutating Pod to attach init container, sidecar containers, and an emptyDir volume.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').fastifyreply} res
 */
const mutate = async (req, res) => {
  const uid = req.body.request.uid

  try {
    /** @type {import('@kubernetes/client-node').V1Container} */
    const container = k8sAdmissionReviewHelper.createRedisContainer(req.body.request.object)

    // JSON Patch format
    const patchResult = [
      { op: 'add', path: `/spec/containers/-`, value: container }
    ]

    const base64Result = Buffer.from(JSON.stringify(patchResult)).toString('base64')
    return k8sAdmissionReviewHelper.buildAllowResponse(uid, undefined, base64Result)
  } catch (error) {
    req.log.error(`Error patching pod: ${error}`)
    return k8sAdmissionReviewHelper.buildRejectResponse(uid, {
      code: 500,
      message: error?.message ?? `Unknown error. Request ID: ${req.id}`
    })
  }
}

/**
 * Validate Pod to see if sidecar container is patched.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').fastifyreply} res
 */
const validateMutationResult = async (req, res) => {
  const uid = req.body.request.uid

  // Any successfully mutated pod request shouldn't reach here as it will be allowed from hook "fastifyHooks.skipOnPatchedPod".
  // Just reject if nothing further needs to be done.
  return k8sAdmissionReviewHelper.buildRejectResponse(uid, {
    code: 400,
    message: 'Pod validation failed.'
  })
}

/**
 * @param {import('fastify').FastifyInstance} v1Apis
 * @param {import('fastify').FastifyPluginOptions} opts
 * @param {import('fastify').HookHandlerDoneFunction} done
 */
const v1 = (v1Apis, opts, done) => {
  v1Apis.register((sidecarMutatingApis, logMutatingApiOpts, done) => {
    sidecarMutatingApis.addHook('preHandler', fastifyHooks.skipOnDryRunRequest)
    sidecarMutatingApis.addHook('preHandler', fastifyHooks.skipOnPodWithoutAnnotations)
    sidecarMutatingApis.addHook('preHandler', fastifyHooks.rejectOnInvalidAnnotations)
    sidecarMutatingApis.addHook('preHandler', fastifyHooks.skipOnPatchedPod)

    sidecarMutatingApis.post('/hook/cache/mutate', mutate)

    sidecarMutatingApis.post('/hook/cache/validate', validateMutationResult)
    done()
  })

  done()
}

module.exports = v1
