// Make sure the sidecar container name is fixed
const REDIS_SIDECAR_CONTAINER = 'wtcx-example-redis'

/**
 * @param {import('@kubernetes/client-node').V1Pod} pod
 * @returns {import('@kubernetes/client-node').V1Container}
 */
const createRedisContainer = pod => {
  const annotations = pod.metadata.annotations
  const port = parseInt(annotations?.['cache.wtcx.dev/port']) || 6379
  const mem = annotations?.['cache.wtcx.dev/memory'] || '100Mi'

  /** @type {import('@kubernetes/client-node').V1Container} */
  const container = {
    name: REDIS_SIDECAR_CONTAINER,
    image: 'redis:alpine',
    command: [
      'sh',
      '-c',
      `redis-server --port ${port}`
    ],
    resources: {
      requests: {
        cpu: '100m',
        memory: mem
      },
      limits: {
        cpu: '100m',
        memory: mem
      }
    },
    ports: [
      {
        containerPort: port
      }
    ]
  }

  return container
}

/**
 * @param {import('@kubernetes/client-node').V1Pod} pod
 * @returns {string}
 */
const isSidecarPatched = pod => {
  let isPatched = false

  for (const container of pod.spec?.containers) {
    if (container.name === REDIS_SIDECAR_CONTAINER) {
      // We can do further, like check whether the port and the memory usage match annotations.
      // But since the container's name matches, it's rather unnecessary to go that far.
      isPatched = true
      break
    }
  }

  return isPatched
}

/**
 * @param {import('@kubernetes/client-node').V1Pod} pod
 * @returns {boolean}
 */
const areAnnotationsValid = pod => {
  const annotations = pod.metadata.annotations
  const port = annotations?.['cache.wtcx.dev/port']

  if (!/^\d+$/.test(port)) {
    return false
  }

  const mem = annotations?.['cache.wtcx.dev/memory']
  if (!/\d+(Mi|Gi)/.test(mem)) {
    return false
  }

  return true
}

/** @param {boolean} allowed */
const buildMinimalResponse = allowed =>
  /**
   * @param {string} uid
   * @param {object} [status] Optional status object
   * @param {number} status.code HTTP status code
   * @param {string} status.message Message presented to user
   * @param {string} [patch] Base64 encoded string
   */
  function genResponse(uid, status, patch) {
    const result = {
      apiVersion: 'admission.k8s.io/v1',
      kind: 'AdmissionReview',
      response: {
        uid: uid,
        allowed: allowed,
        patch: patch,
        status: status
      }
    }

    if (patch) {
      /**
       * Always 'JSONPatch'. Needs to be paired with "patch" key.
       * @url https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#response
       */
      result.response.patchType = 'JSONPatch'
    }
    return result
  }

/** @param {string} uid */
const buildAllowResponse = buildMinimalResponse(true)

/** @param {string} uid */
const buildRejectResponse = buildMinimalResponse(false)

module.exports = {
  buildAllowResponse,
  buildRejectResponse,
  isSidecarPatched,
  areAnnotationsValid,
  createRedisContainer
}
