const k8sAdmissionReviewHelper = require('./admission_review_helper')

/**
 * Directly reject when annotations are invalid.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} res
 */
const rejectOnInvalidAnnotations = async (req, res) => {
  const valid = k8sAdmissionReviewHelper.areAnnotationsValid(req.body.request.object)
  if (!valid) {
    return res.send(k8sAdmissionReviewHelper.buildRejectResponse(req.body.request.uid, {
      code: 400,
      message: 'Annotation validation failed.'
    }))
  }
}

/**
 * Directly allow when it's a dry-run request.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} res
 */
const skipOnDryRunRequest = async (req, res) => {
  // Not a dry run request. Proceed to next handler.
  if (!req?.body?.request?.dryRun) {
    return
  }

  req.log.info('Skip on dry run request.')
  return res.send(k8sAdmissionReviewHelper.buildAllowResponse(req.body.request.uid))
}

/**
 * Directly allow when pod is fully patched.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} res
 */
const skipOnPatchedPod = async (req, res) => {
  const isPatched = k8sAdmissionReviewHelper.isSidecarPatched(req.body.request.object)
  if (isPatched) {
    return res.send(k8sAdmissionReviewHelper.buildAllowResponse(req.body.request.uid))
  }
}

/**
 * Directly allow when the pod doesn't contain injection annotation.
 *
 * @param {import('fastify').FastifyRequest} req
 * @param {import('fastify').FastifyReply} res
 */
const skipOnPodWithoutAnnotations = async (req, res) => {
  /** @type {import('@kubernetes/client-node').V1Pod} */
  const pod = req.body.request.object
  const hasInjectAnnotation = pod.metadata.annotations?.['cache.wtcx.dev/inject'] === 'true'

  if (!hasInjectAnnotation) {
    req.log.info(`Skip on pod without inject annotation.`)
    return res.send(k8sAdmissionReviewHelper.buildAllowResponse(req.body.request.uid))
  }
}

module.exports = {
  skipOnDryRunRequest,
  skipOnPatchedPod,
  skipOnPodWithoutAnnotations,
  rejectOnInvalidAnnotations
}
