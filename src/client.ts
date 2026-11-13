import { HttpClient } from './http'
import {
  UploadsResource,
  MediaResource,
  AiResource,
  AnalyticsResource,
  EngagementResource,
  WebhooksResource,
  WorkspacesResource,
} from './resources'
import type { SocifyrConfig, HealthStatus } from './types'

/**
 * Socifyr SDK client — publish to 10+ social platforms with one API call.
 *
 * @example
 * ```ts
 * import { Socifyr } from '@socifyr/sdk'
 *
 * const socifyr = new Socifyr({
 *   apiKey: 'sk_...', // the key belongs to one workspace; no workspace id needed
 * })
 *
 * // Publish a video to Instagram Reels + TikTok
 * const upload = await socifyr.uploads.video({
 *   connections: ['instagram-mybrand', 'tiktok-mybrand'],
 *   medias: [fs.readFileSync('./video.mp4')],
 *   title: 'Check this out!',
 *   instagram: { mediaType: 'REELS' },
 * })
 *
 * // Generate AI content
 * const content = await socifyr.ai.generateContent({
 *   uploadType: 'video',
 *   platforms: ['instagram', 'linkedin'],
 *   tone: 'professional',
 * })
 * ```
 */
export class Socifyr {
  private readonly http: HttpClient

  /** Upload videos, photos, text, and documents to social platforms */
  readonly uploads: UploadsResource

  /** Manage reusable media files */
  readonly media: MediaResource

  /** AI-powered content generation, hashtag suggestions, and best times */
  readonly ai: AiResource

  /** Cross-platform analytics */
  readonly analytics: AnalyticsResource

  /** Engagement metrics backfill and management */
  readonly engagement: EngagementResource

  /** Manage webhook endpoints for real-time notifications */
  readonly webhooks: WebhooksResource

  /** Manage workspaces, members, invitations, and API keys */
  readonly workspaces: WorkspacesResource

  constructor(config: SocifyrConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required. Get one at https://socifyr.com/settings/api-keys')
    }

    this.http = new HttpClient(config)
    this.uploads = new UploadsResource(this.http)
    this.media = new MediaResource(this.http)
    this.ai = new AiResource(this.http)
    this.analytics = new AnalyticsResource(this.http)
    this.engagement = new EngagementResource(this.http)
    this.webhooks = new WebhooksResource(this.http)
    this.workspaces = new WorkspacesResource(this.http)
  }

  /**
   * Check API health status.
   *
   * @example
   * ```ts
   * const health = await socifyr.health()
   * console.log(health.status) // 'ok'
   * ```
   */
  async health(): Promise<HealthStatus> {
    return this.http.get('/health')
  }
}
