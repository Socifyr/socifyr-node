import type { HttpClient } from '../http'

export class EngagementResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Trigger a backfill of engagement metrics for existing posts.
   * Enqueues fetch jobs for posts that haven't had their engagement data collected yet.
   *
   * @example
   * ```ts
   * const result = await socifyr.engagement.backfill()
   * console.log(`${result.enqueued} fetch jobs enqueued`)
   * ```
   */
  async backfill(): Promise<{ enqueued: number }> {
    return this.http.post('/engagement/backfill')
  }

  /**
   * Re-enable engagement insights that were paused because a platform refused
   * them for a missing permission (e.g. Meta/TikTok before app review). Clears
   * the pause flag across the workspace's posts and re-enqueues a backfill.
   * Call once the platform grants the permission. Pass a platform to scope it
   * to one network. Safe to re-run: still-missing permissions re-pause.
   *
   * @example
   * ```ts
   * const { cleared, enqueued } = await socifyr.engagement.resetInsights('tiktok')
   * console.log(`${cleared} posts un-paused, ${enqueued} fetches queued`)
   * ```
   */
  async resetInsights(
    platform?: string,
  ): Promise<{ cleared: number; enqueued: number }> {
    const qs = platform ? `?platform=${encodeURIComponent(platform)}` : ''
    return this.http.post(`/engagement/reset-insights${qs}`)
  }
}
