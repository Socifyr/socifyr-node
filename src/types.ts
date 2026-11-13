// ── SDK Configuration ──────────────────────────────────────────────────────

export interface SocifyrConfig {
  /** API key (prefixed with `sk_`) */
  apiKey: string
  /**
   * @deprecated Not needed — an API key belongs to exactly one workspace, and
   * the API always uses that workspace. Accepted (and ignored by the server
   * for `sk_` keys) for backward compatibility.
   */
  workspaceId?: string
  /** Base URL of the Socifyr API (default: https://api.socifyr.com/api) */
  apiUrl?: string
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Number of retries on transient failures (default: 2) */
  maxRetries?: number
}

// ── API Response ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  results: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// ── Platforms ──────────────────────────────────────────────────────────────

export const PLATFORMS = [
  'instagram',
  'facebook',
  'x',
  'linkedin',
  'tiktok',
  'youtube',
  'threads',
  'pinterest',
  'reddit',
  'bluesky',
  'telegram',
  'discord',
  'mastodon',
  'nostr',
  'slack',
  'devto',
  'hashnode',
  'tumblr',
] as const

export type Platform = (typeof PLATFORMS)[number]

// ── Upload Types ──────────────────────────────────────────────────────────

export type UploadType = 'video' | 'photo' | 'text' | 'document'

export type UploadStatus =
  | 'draft'
  | 'pending'
  | 'queued'
  | 'processing'
  | 'publishing'
  | 'completed'
  | 'partial_failure'
  | 'failed'

export interface FirstComment {
  text?: string
  linkUrl?: string
  imageUrl?: string
}

export interface PlatformContentOverrides {
  title?: string
  description?: string
  text?: string
  firstComment?: FirstComment | string
  linkUrl?: string
}

export interface InstagramOptions extends PlatformContentOverrides {
  mediaType?: 'REELS' | 'STORIES' | 'FEED'
  coverUrl?: string
}

export interface TikTokOptions extends PlatformContentOverrides {
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'
  disableDuet?: boolean
  disableComment?: boolean
  disableStitch?: boolean
}

export interface FacebookOptions extends PlatformContentOverrides {
  pageId?: string
  mediaType?: 'FEED_VIDEO' | 'STORIES' | 'REELS'
}

export interface LinkedInOptions extends PlatformContentOverrides {
  visibility?: 'PUBLIC' | 'CONNECTIONS'
}

export interface XOptions extends PlatformContentOverrides {
  replySettings?: 'EVERYONE' | 'FOLLOWERS' | 'MENTIONED_USERS'
}

export type MediaInput = Buffer | Blob | string

/**
 * Per-connection or per-platform option overrides.
 * Keys are connection slugs (e.g. "instagram-mybrand"), connection ObjectIds,
 * or platform names (e.g. "instagram") for a global platform-wide override.
 */
export type ConnectionOptions = PlatformContentOverrides &
  Omit<Partial<InstagramOptions>, keyof PlatformContentOverrides> &
  Omit<Partial<TikTokOptions>, keyof PlatformContentOverrides> &
  Omit<Partial<FacebookOptions>, keyof PlatformContentOverrides> &
  Omit<Partial<LinkedInOptions>, keyof PlatformContentOverrides> &
  Omit<Partial<XOptions>, keyof PlatformContentOverrides> & {
    [key: string]: unknown
  }

export interface UploadOptions {
  /**
   * Target connections — use stable connection slugs (e.g. "instagram-mybrand",
   * "facebook-my-page") or MongoDB ObjectIds.
   */
  connections: string[]
  /** Post title */
  title?: string
  /** Post description / body text */
  description?: string
  /** Schedule for later (ISO-8601) */
  scheduledAt?: string
  /** Timezone for scheduled post (e.g. "America/New_York") */
  timezone?: string
  /** First comment on supported platforms */
  firstComment?: FirstComment | string
  /** Link URL to attach */
  linkUrl?: string
  /** Process asynchronously (returns requestId for polling) */
  async?: boolean
  /** Save as draft without publishing — use uploads.publishDraft(id) to publish later */
  saveDraft?: boolean
  /** Caption / body text for the post */
  text?: string
  /** Content format hint (e.g. 'short_video', 'story', 'photo_carousel') */
  contentFormat?: string
  /**
   * Per-connection or per-platform overrides.
   * Keys are connection slugs (e.g. "instagram-mybrand"), ObjectIds,
   * or platform names (e.g. "instagram") for a global platform-wide override.
   *
   * @example
   * platformOptions: {
   *   'instagram-mybrand': { mediaType: 'REELS' },
   *   'x-myhandle': { replySettings: 'EVERYONE' },
   *   'linkedin-myprofile': { visibility: 'PUBLIC' },
   * }
   */
  platformOptions?: Record<string, ConnectionOptions>
}

export interface UploadVideoParams extends UploadOptions {
  /**
   * Video media — Buffer/Blob for raw file, or string (media library ID / public URL).
   * For multipart forms, use `medias[]` field name.
   */
  medias?: MediaInput[]
}

export interface UploadPhotosParams extends UploadOptions {
  /**
   * Photo media — Buffer/Blob for raw files, or string (media library ID / public URL).
   * For multipart forms, use `medias[]` field name.
   */
  medias?: MediaInput[]
}

export interface UploadTextParams extends UploadOptions {
  /** Text content (1–25000 chars) */
  text: string
}

export interface BulkScheduleRow {
  text: string
  /** Connection slugs (array, or a space/comma-separated string). */
  connections: string[] | string
  /** ISO-8601 future datetime. */
  scheduledAt: string
  title?: string
}

export interface BulkScheduleParams {
  /** Rows to schedule. Provide this OR `csv`. */
  rows?: BulkScheduleRow[]
  /** Raw CSV (header: text,connections,scheduledAt,title). Provide this OR `rows`. */
  csv?: string
}

export interface BulkScheduleResult {
  created: number
  failed: Array<{ row: number; error: string }>
}

export interface UploadDocumentParams extends UploadOptions {
  /**
   * Document media — Buffer/Blob for raw file, or string (media library ID / public URL).
   * For multipart forms, use `medias[]` field name.
   */
  medias?: MediaInput[]
}

/** Tier usage snapshot returned by create/publish endpoints */
export interface TierUsage {
  count: number
  /** Monthly upload limit (-1 = unlimited) */
  limit: number
  /** Remaining uploads this month (-1 = unlimited) */
  remaining: number
}

/**
 * Ack from a create / publish / retry call.
 *
 * The API returns `uploadId` (immediate & scheduled posts) or `draftId`
 * (`saveDraft: true`); the SDK normalizes both onto `id`. On the `async: true`
 * path the API only returns a `requestId` — poll `uploads.getStatus(requestId)`.
 */
export interface Upload {
  /** Content/upload ID (normalized from `uploadId` or `draftId`) */
  id?: string
  /** Request ID for status polling */
  requestId?: string
  /** Tier usage after the operation */
  usage?: TierUsage
  /** Human-readable ack (async dispatch) */
  message?: string
  scheduledAt?: string
  totalChannels?: number
  /** Retry ack only — number of failed channels re-queued */
  retriedChannels?: number
}

/** Per-channel result embedded in upload details and status responses */
export interface UploadDetail {
  id: string
  type: UploadType
  contentFormat?: string | null
  status: UploadStatus
  title?: string | null
  description?: string | null
  text?: string | null
  requestId?: string | null
  scheduledAt?: string | null
  channels: UploadStatusChannel[]
  platformOptions?: Record<string, unknown> | null
  archivedAt?: string | null
  createdAt: string
}

/** Item from `uploads.list()` — note the items live under the `data` key */
export interface UploadSummary {
  id: string
  type: UploadType
  contentFormat?: string | null
  status: UploadStatus
  title?: string | null
  description?: string | null
  text?: string | null
  requestId?: string | null
  mediaThumbnail?: {
    url: string
    type: string
    mimeType: string
    isArchived?: boolean
  } | null
  channels: UploadStatusChannel[]
}

export interface UploadListResponse {
  /** Items live under `data` (not `results`), pagination under `meta` */
  data: UploadSummary[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface PlatformEngagement {
  likes: number
  comments: number
  shares: number
  impressions: number
  clicks: number
  saves: number
  engagementRate: number
  lastFetchedAt?: string
  fetchCount: number
}

export interface PlatformResult {
  platform: Platform
  status: 'success' | 'failed' | 'pending'
  postId?: string
  postUrl?: string
  error?: string
  engagement?: PlatformEngagement
}

export interface UploadStatusChannel {
  platform: string
  connectionId: string
  targetId?: string
  targetName?: string
  result?: {
    status: 'pending' | 'success' | 'failed' | string
    postId?: string
    postUrl?: string
    error?: string
    publishedAt?: string
    engagement?: unknown
  }
}

export interface UploadStatusResponse {
  requestId: string
  uploadId: string
  status: UploadStatus
  type: UploadType
  channels: UploadStatusChannel[]
  createdAt: string
}

export interface UploadHistoryQuery {
  page?: number
  limit?: number
  status?: UploadStatus
  platform?: Platform
  type?: UploadType
  from?: string
  to?: string
}

// ── Media Library ─────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video' | 'document'
export type MediaSortBy = 'createdAt' | 'name'

export interface MediaItem {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  url: string
  thumbnailUrl?: string
  type: MediaType
  alt?: string
  description?: string
  tags?: string[]
  usedInContentCount?: number
  createdAt: string
  updatedAt?: string
}

export interface MediaQuery {
  type?: MediaType
  search?: string
  page?: number
  limit?: number
  sortBy?: MediaSortBy
  sortOrder?: 'asc' | 'desc'
}

export interface MediaMetadata {
  alt?: string
  description?: string
  tags?: string[]
}

// ── AI ────────────────────────────────────────────────────────────────────

export type Tone = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'informative'

export interface GenerateContentParams {
  uploadType: UploadType
  platforms: Platform[]
  text?: string
  title?: string
  description?: string
  tone?: Tone
  brandVoice?: string
}

export interface GeneratedContent {
  /** Map of platform key → generated caption text */
  content: Record<string, string>
}

export interface SuggestHashtagsParams {
  text: string
  platforms: Platform[]
  count?: number
  existingHashtags?: string[]
}

export interface SuggestedHashtags {
  platform: Platform
  hashtags: string[]
}

export interface AiStatus {
  available: boolean
}

// ── Draft Update ─────────────────────────────────────────────────────────

export interface UpdateDraftParams {
  type?: UploadType
  connections?: string[]
  title?: string
  description?: string
  text?: string
  firstComment?: FirstComment
  mediaIds?: string[]
  scheduledAt?: string
  timezone?: string
  platformOptions?: Record<string, ConnectionOptions>
  contentFormat?: string
}

// ── Analytics ─────────────────────────────────────────────────────────────

export type AnalyticsGranularity = 'daily' | 'weekly' | 'monthly'

export interface AnalyticsQuery {
  from?: string
  to?: string
  platform?: string
  granularity?: AnalyticsGranularity
}

export interface Analytics {
  snapshots: AnalyticsDataPoint[]
  summary: AnalyticsSummary
  platformBreakdown: PlatformAnalytics[]
}

export interface AnalyticsSummary {
  totalPublished: number
  totalSucceeded: number
  totalFailed: number
  successRate: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalImpressions: number
  avgEngagementRate: number
}

export interface PlatformAnalytics {
  platform: string
  published: number
  succeeded: number
  failed: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalImpressions: number
  avgEngagementRate: number
}

export interface AnalyticsDataPoint {
  date: string
  platform?: string
  metrics: {
    postsPublished: number
    postsSucceeded: number
    postsFailed: number
    totalLikes: number
    totalComments: number
    totalShares: number
    totalImpressions: number
    avgEngagementRate: number
  }
}

export interface PostChannelAnalytics {
  platform: Platform
  status: 'success' | 'failed' | 'pending'
  postId: string | null
  postUrl: string | null
  publishedAt: string | null
  targetName: string | null
  error: string | null
  engagement: PlatformEngagement | null
}

export interface PostAnalytics {
  uploadId: string
  requestId: string | null
  title: string | null
  status: UploadStatus
  scheduledAt: string | null
  createdAt: string
  platforms: PostChannelAnalytics[]
}

export interface PlatformMetric {
  platform: string
  primaryImpression: string
  metrics: string[]
  labels: Record<string, string>
}

// ── Follower growth & account comparison ─────────────────────────────────

export type AnalyticsPeriod = 'last_day' | 'last_week' | 'last_month' | 'last_3months' | 'last_year'

export interface AccountAnalyticsQuery {
  /** Shorthand window; overrides from/to. Defaults to the last 30 days. */
  period?: AnalyticsPeriod
  from?: string
  to?: string
  /** Connection slug, e.g. `instagram-mybrand` */
  connection?: string
  platform?: string
}

export interface FollowerPoint {
  /** YYYY-MM-DD (UTC) */
  date: string
  followers: number
}

export interface AccountFollowerGrowth {
  connectionId: string
  slug: string | null
  platform: string
  username: string
  /** False when the platform can't report an audience count (e.g. LinkedIn, TikTok). */
  isTracked: boolean
  /** Latest count in the window; null until the first daily snapshot. */
  followers: number | null
  change: number
  changePct: number | null
  series: FollowerPoint[]
}

export interface FollowerGrowth {
  from: string
  to: string
  totals: { followers: number; change: number }
  accounts: AccountFollowerGrowth[]
}

export interface AccountComparisonRow {
  connectionId: string
  slug: string | null
  platform: string
  username: string
  isTracked: boolean
  followers: number | null
  followerChange: number
  followerChangePct: number | null
  posts: number
  likes: number
  comments: number
  shares: number
  saves: number
  impressions: number
  /** likes + comments + shares + saves */
  engagement: number
  avgEngagementPerPost: number
  /** engagement ÷ impressions, percent */
  engagementRate: number
  /** avg engagement per post ÷ followers, percent */
  followerEngagementRate: number | null
}

export interface AccountComparison {
  from: string
  to: string
  accounts: AccountComparisonRow[]
}

export interface AnalyticsSyncResult {
  success: boolean
  /** Today's follower snapshots captured/failed for this workspace. */
  followers?: { captured: number; failed: number }
}

// ── Webhooks ──────────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'upload.completed',
  'upload.failed',
  'upload.partial_failure',
  'platform.success',
  'platform.failed',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  active: boolean
  description?: string
  secret: string
  createdAt: string
  updatedAt: string
}

export interface CreateWebhookParams {
  url: string
  events: WebhookEvent[]
  description?: string
}

export interface UpdateWebhookParams {
  url?: string
  events?: WebhookEvent[]
  active?: boolean
  description?: string
}

export interface WebhookDelivery {
  id: string
  event: WebhookEvent
  status: 'success' | 'failed'
  statusCode?: number
  payload: Record<string, unknown>
  response?: string
  attemptedAt: string
}

// ── Workspaces ────────────────────────────────────────────────────────────

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'CONTRIBUTOR'
export type InvitableRole = Exclude<WorkspaceRole, 'OWNER'>

export interface Workspace {
  id: string
  name: string
  platforms: WorkspacePlatform[]
  createdAt: string
  updatedAt: string
}

export interface WorkspacePlatform {
  platform: Platform
  connected: boolean
  pages?: PlatformPage[]
}

export interface PlatformPage {
  id: string
  name: string
  active: boolean
}

export interface Connection {
  id: string
  slug: string
  platform: Platform
  platformUsername: string
  targetName: string | null
  targetImageUrl: string | null
  profileImageUrl?: string
  connectedAt: string
  disconnectedAt?: string
  expiresAt: string | null
  /** Health: `needs_reconnect` means only a reconnect link can fix it. */
  status?: ConnectionStatus
  /** Whether `refreshConnection` can renew this token without the owner. */
  canRefresh?: boolean
  hasRefreshToken?: boolean
}

export type ConnectionStatus = 'active' | 'expiring' | 'needs_reconnect'

export interface ConnectionRefreshResult {
  id: string
  slug: string | null
  platform: Platform
  expiresAt: string | null
  lastRefreshedAt: string | null
  status: ConnectionStatus
  canRefresh: boolean
}

export interface ReconnectLink {
  /** Short-lived, single-use URL — the account owner opens it to re-authorize. */
  url: string
  /** Seconds until the link expires. */
  expiresIn: number
  platform: Platform
  slug: string | null
}

export interface WorkspaceMember {
  userId: string
  email: string
  name?: string
  role: WorkspaceRole
  joinedAt: string
}

export interface Invitation {
  id: string
  email: string
  role: InvitableRole
  token: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: string
  expiresAt: string
}

export interface ApiKey {
  id: string
  label: string
  prefix: string
  createdAt: string
  lastUsedAt?: string
  /** Max posts per UTC day through this key; null/undefined = unlimited. */
  dailyPostLimit?: number | null
  /** Monthly X (Twitter) spend cap in US cents; null/undefined = unlimited. */
  monthlyXSpendCentsCap?: number | null
  /** Posts created with this key land in pending_approval. */
  requireApproval?: boolean
  /** Accrued X spend this month, US cents. */
  xSpendCents?: number
  /** Month the accrued spend belongs to (YYYY-MM). */
  xSpendMonth?: string | null
}

export interface UpdateApiKeyParams {
  label?: string
  dailyPostLimit?: number | null
  monthlyXSpendCentsCap?: number | null
  requireApproval?: boolean
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string
}

// ── Health ─────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  services: Record<string, 'ok' | 'down'>
}

// ── Usage ──────────────────────────────────────────────────────────────────

/** One usage dimension. `limit`/`remaining` are null when unlimited. */
export interface UsageDimension {
  used: number
  limit: number | null
  remaining: number | null
  unlimited: boolean
}

export interface UsageSummary {
  tier: 'free' | 'pro' | 'business'
  uploads: UsageDimension
  accounts: UsageDimension
  xPosts: UsageDimension
  /** Posts scheduled for later this month (Free plan caps these). Absent on older servers. */
  scheduledPosts?: UsageDimension
  /** Estimated X API spend this month, in US dollars. */
  xSpendUsd: number
  storage: UsageDimension & { usedBytes: number; limitBytes: number | null }
}
