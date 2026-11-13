import { enc } from '../http'
import type { HttpClient } from '../http'
import type {
  Analytics,
  AnalyticsQuery,
  PostAnalytics,
  PlatformMetric,
  AccountAnalyticsQuery,
  FollowerGrowth,
  AccountComparison,
  AnalyticsSyncResult,
} from '../types'

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get workspace analytics with optional date range and platform filtering.
   *
   * @example
   * ```ts
   * const stats = await socifyr.analytics.get({
   *   from: '2026-01-01',
   *   to: '2026-03-31',
   *   granularity: 'weekly',
   * })
   *
   * console.log(`Total reach: ${stats.totalReach}`)
   * ```
   */
  async get(query: AnalyticsQuery = {}): Promise<Analytics> {
    return this.http.get('/analytics', query as Record<string, unknown>)
  }

  /**
   * Manually trigger an analytics sync from all connected platforms.
   * Useful after publishing to get fresh data.
   *
   * @example
   * ```ts
   * await socifyr.analytics.sync()
   * ```
   */
  async sync(): Promise<AnalyticsSyncResult> {
    return this.http.post('/analytics/sync')
  }

  /**
   * Follower growth per connected account — daily counts, change and percent
   * change over the window (default: last 30 days). Counts are snapshotted
   * once per UTC day.
   *
   * @example
   * ```ts
   * const { accounts, totals } = await socifyr.analytics.followers({ period: 'last_3months' })
   * for (const a of accounts) console.log(a.slug, a.followers, a.change)
   * ```
   */
  async followers(query: AccountAnalyticsQuery = {}): Promise<FollowerGrowth> {
    return this.http.get('/analytics/followers', query as Record<string, unknown>)
  }

  /**
   * Compare connected accounts side by side — followers, follower change,
   * posts, engagement and engagement rates for the window (default: last 30 days).
   *
   * @example
   * ```ts
   * const { accounts } = await socifyr.analytics.accounts({ period: 'last_month' })
   * console.table(accounts.map((a) => ({ account: a.slug, followers: a.followers, engagement: a.engagement })))
   * ```
   */
  async accounts(query: AccountAnalyticsQuery = {}): Promise<AccountComparison> {
    return this.http.get('/analytics/accounts', query as Record<string, unknown>)
  }

  async getPost(uploadId: string): Promise<PostAnalytics> {
    return this.http.get(`/analytics/post/${enc(uploadId)}`)
  }

  async getPlatformMetrics(): Promise<PlatformMetric[]> {
    return this.http.get('/analytics/platform-metrics')
  }
}
