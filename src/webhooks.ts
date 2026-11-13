import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Socifyr webhook signature.
 *
 * Socifyr sends `X-Webhook-Signature: sha256=<hex>` — an HMAC-SHA256 of the
 * raw request body using the webhook's secret (GitHub-style, no timestamp).
 * The event payload itself carries `timestamp` and `deliveryId` fields you
 * can use for replay-window checks.
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature, parseWebhookEvent } from '@socifyr/sdk'
 *
 * app.post('/webhooks/socifyr', (req, res) => {
 *   const raw = await readRawBody(req)    // exact bytes received
 *   const isValid = verifyWebhookSignature(
 *     raw,
 *     req.headers['x-webhook-signature'],  // "sha256=<hex>"
 *     process.env.WEBHOOK_SECRET,
 *   )
 *
 *   if (!isValid) {
 *     return res.status(401).send('Invalid signature')
 *   }
 *
 *   const event = parseWebhookEvent(raw)
 *   // handle event...
 * })
 * ```
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false

  const PREFIX = 'sha256='
  if (!signature.startsWith(PREFIX)) return false
  const expectedSig = signature.slice(PREFIX.length)

  const body = typeof payload === 'string' ? payload : payload.toString('utf8')
  const computedSig = createHmac('sha256', secret).update(body).digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(computedSig, 'hex'),
      Buffer.from(expectedSig, 'hex'),
    )
  } catch {
    return false
  }
}

/**
 * Parse and type a webhook event payload.
 *
 * @example
 * ```ts
 * import { parseWebhookEvent } from '@socifyr/sdk'
 *
 * const event = parseWebhookEvent(rawBody)
 * switch (event.event) {
 *   case 'upload.completed':
 *     console.log('Upload done:', event.payload.uploadId)
 *     break
 *   case 'upload.failed':
 *     console.error('Upload failed:', event.payload.error)
 *     break
 * }
 * ```
 */
export function parseWebhookEvent(payload: string | Buffer): WebhookEventPayload {
  const body = typeof payload === 'string' ? payload : payload.toString('utf8')
  return JSON.parse(body) as WebhookEventPayload
}

/** Body of a Socifyr webhook delivery */
export interface WebhookEventPayload {
  /** Event name, e.g. 'upload.completed' */
  event:
    | 'upload.completed'
    | 'upload.failed'
    | 'upload.partial_failure'
    | 'platform.success'
    | 'platform.failed'
  /** Event-specific data (uploadId, channel, error, ...) */
  payload: Record<string, unknown>
  /** Delivery creation time — identical across retries, usable for replay windows */
  timestamp: string
  /** Unique delivery attempt ID */
  deliveryId: string
}
