import { enc, type HttpClient } from '../http'
import type {
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
} from '../types'

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Register a webhook endpoint to receive real-time event notifications.
   *
   * @example
   * ```ts
   * const webhook = await socifyr.webhooks.create({
   *   url: 'https://myapp.com/webhooks/socifyr',
   *   events: ['upload.completed', 'upload.failed'],
   *   description: 'Production webhook',
   * })
   *
   * // Store webhook.secret for signature verification
   * ```
   */
  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.http.post('/webhooks', params)
  }

  /**
   * List all webhooks for the workspace.
   */
  async list(): Promise<Webhook[]> {
    return this.http.get('/webhooks')
  }

  /**
   * Get a webhook by ID.
   */
  async get(id: string): Promise<Webhook> {
    return this.http.get(`/webhooks/${enc(id)}`)
  }

  /**
   * Update a webhook's URL, events, active status, or description.
   *
   * @example
   * ```ts
   * await socifyr.webhooks.update('wh_123', { active: false })
   * ```
   */
  async update(id: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.http.patch(`/webhooks/${enc(id)}`, params)
  }

  /**
   * Delete a webhook.
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/webhooks/${enc(id)}`)
  }

  /**
   * List the last 50 delivery attempts for a webhook.
   *
   * @example
   * ```ts
   * const deliveries = await socifyr.webhooks.deliveries('wh_123')
   * const failed = deliveries.filter(d => d.status === 'failed')
   * ```
   */
  async deliveries(webhookId: string): Promise<WebhookDelivery[]> {
    return this.http.get(`/webhooks/${enc(webhookId)}/deliveries`)
  }
}
