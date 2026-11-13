# @socifyr/sdk

Official TypeScript SDK for the Socifyr API. Publish to 10+ social platforms with one API call.

**Supported platforms:** Instagram, Facebook, X (Twitter), LinkedIn, TikTok, YouTube, Threads, Pinterest, Reddit, Bluesky

## Installation

```bash
bun add @socifyr/sdk
# or
npm install @socifyr/sdk
```

## Quick Start

```typescript
import { Socifyr } from '@socifyr/sdk'
import fs from 'node:fs'

const socifyr = new Socifyr({
  apiKey: 'sk_...',
})

// Publish a video to Instagram Reels + TikTok in one call
const upload = await socifyr.uploads.video({
  connections: ['instagram-mybrand', 'tiktok-mybrand'],
  medias: [fs.readFileSync('./video.mp4')],
  title: 'Check this out!',
  platformOptions: {
    'instagram-mybrand': { mediaType: 'REELS' },
    'tiktok-mybrand': { privacyLevel: 'PUBLIC_TO_EVERYONE' },
  },
})

console.log(upload.id)        // '6b1f...' (content ID)
console.log(upload.requestId) // '9f2c7a1e-...' (for status polling)
```

## Authentication

Create an API key at **Settings > API Keys** in your Socifyr dashboard, or programmatically. Each key belongs to exactly one workspace, and the SDK always works in that workspace, so there is no workspace ID to configure. To work with several workspaces (for example one per client), use one key per workspace.

```typescript
const key = await socifyr.workspaces.createApiKey({
  label: 'My Integration',
})
console.log('Save this key:', key.key) // sk_... — shown only once
```

## Configuration

```typescript
const socifyr = new Socifyr({
  apiKey: 'sk_...',                                // Required
  apiUrl: 'https://api.socifyr.com/api',           // Default
  timeout: 30000,                                  // Default: 30000 (ms)
  maxRetries: 2,                                   // Default: 2
})

// Check the API is up
const health = await socifyr.health()
console.log(health.status)   // 'ok' | 'degraded' | 'down'
console.log(health.services) // { database: 'ok', redis: 'ok' }
```

## Core Concepts

### Connection slugs

Every publishing call targets **connections** — stable slugs that identify a connected social account, e.g. `instagram-mybrand` or `facebook-my-page`. List them with:

```typescript
const connections = await socifyr.workspaces.listConnections()
for (const c of connections) {
  console.log(c.slug, c.platform, c.targetName ?? c.platformUsername)
}
// instagram-mybrand   instagram  @mybrand
// tiktok-mybrand      tiktok     mybrand
// youtube-mybrand     youtube    My Brand Channel
```

Never use raw platform names in `connections` — that field takes slugs (or connection ObjectIds). Platform names like `'instagram'` are only accepted in **AI** calls (`platforms` field) and as `platformOptions` keys.

### The upload ack — sync, async, and draft

Create/publish methods all return the same normalized `Upload` ack. The API returns `uploadId` (immediate & scheduled) or `draftId` (drafts); the SDK normalizes both onto `id`. On the `async: true` path there is **no ID at all** — only a `requestId` to poll:

```typescript
// 1. Immediate/scheduled (default): returns id + requestId
const sync = await socifyr.uploads.text({ connections: ['x-myhandle'], text: 'Hello' })
console.log(sync.id, sync.requestId)
console.log(sync.usage) // { count: 4, limit: 100, remaining: 96 } — tier usage snapshot

// 2. Async: returns requestId ONLY (no id)
const async = await socifyr.uploads.video({
  connections: ['youtube-mybrand'],
  medias: [videoBuffer],
  async: true,
})
console.log(async.id)             // undefined!
console.log(async.requestId)      // poll with this
console.log(async.message)        // 'Upload processing started'
console.log(async.totalChannels)  // 1

// 3. Draft: returns the draft ID
const draft = await socifyr.uploads.text({
  connections: ['x-myhandle'],
  text: 'Saved for later',
  saveDraft: true,
})
console.log(draft.id) // the draft ID — publish later with publishDraft(id)
```

### Status flow

```
draft → pending → queued → processing → publishing → completed
                                            ├→ failed
                                            └→ partial_failure
```

---

## API Reference

Every method on the client, grouped by resource:

| Resource | Methods |
|---|---|
| `socifyr.health()` | `health` |
| `socifyr.uploads` | `video`, `photos`, `text`, `document`, `getStatus`, `waitForCompletion`, `list`, `get`, `update`, `cancel`, `publishNow`, `publishDraft`, `retry`, `archive`, `unarchive`, `bulkDelete`, `bulkArchive`, `bulkUnarchive` |
| `socifyr.media` | `upload`, `list`, `get`, `update`, `delete`, `bulkDelete` |
| `socifyr.ai` | `status`, `generateContent`, `suggestHashtags` |
| `socifyr.analytics` | `get`, `sync`, `getPost`, `getPlatformMetrics`, `followers`, `accounts` |
| `socifyr.engagement` | `backfill` |
| `socifyr.webhooks` | `create`, `list`, `get`, `update`, `delete`, `deliveries` |
| `socifyr.workspaces` | `create`, `list`, `get`, `update`, `delete`, `listConnections`, `disconnectPlatform`, `revokePlatform`, `updatePlatformTarget`, `deleteConnection`, `revokeConnection`, `forkConnection`, `updateConnectionTarget`, `refreshConnection`, `listMembers`, `updateMemberRole`, `removeMember`, `invite`, `listInvitations`, `cancelInvitation`, `listApiKeys`, `createApiKey`, `deleteApiKey` |
| standalone exports | `verifyWebhookSignature`, `parseWebhookEvent`, error classes |

---

## Publishing

### `uploads.video(params): Promise<Upload>`

Post a video. `medias` accepts raw `Buffer`/`Blob` (uploaded to your media library automatically), media library IDs, or public URLs:

```typescript
// Raw file
const upload = await socifyr.uploads.video({
  connections: ['instagram-mybrand', 'tiktok-mybrand', 'youtube-mybrand'],
  medias: [fs.readFileSync('./video.mp4')],
  title: 'Product Launch',
  description: 'Introducing our latest product',
  platformOptions: {
    'instagram-mybrand': { mediaType: 'REELS' },
    'tiktok-mybrand': { privacyLevel: 'PUBLIC_TO_EVERYONE', disableDuet: false },
    'youtube-mybrand': { title: 'YouTube-specific title' },
  },
})

// Media library ID or public URL — no re-upload needed
const upload2 = await socifyr.uploads.video({
  connections: ['tiktok-mybrand'],
  medias: ['6a93a4bfaa1135c3d8dd3df5'],
})

// Mixed sources
const upload3 = await socifyr.uploads.video({
  connections: ['instagram-mybrand', 'youtube-mybrand'],
  medias: [fs.readFileSync('./intro.mp4'), 'https://example.com/clip.mp4'],
})
```

Only one video per post. Use `contentFormat: 'short_video' | 'feed_video' | 'story'` to hint the format (e.g. YouTube Shorts).

### `uploads.photos(params): Promise<Upload>`

Post one or more photos (up to 10, platform-dependent):

```typescript
const upload = await socifyr.uploads.photos({
  connections: ['instagram-mybrand', 'facebook-mybrand', 'linkedin-mybrand'],
  medias: [fs.readFileSync('./photo1.jpg'), fs.readFileSync('./photo2.jpg')],
  text: 'Behind the scenes',
  firstComment: '#bts #studio',
  platformOptions: {
    'instagram-mybrand': { mediaType: 'STORIES' },  // 'REELS' | 'STORIES' | 'FEED'
  },
})

// Reuse library assets or URLs
const upload2 = await socifyr.uploads.photos({
  connections: ['instagram-mybrand'],
  medias: ['6a937894df74747da8fdb8ba', 'https://example.com/banner.jpg'],
  contentFormat: 'photo_carousel',
})
```

### `uploads.text(params): Promise<Upload>`

Post text (1–25,000 chars):

```typescript
const upload = await socifyr.uploads.text({
  connections: ['x-myhandle', 'linkedin-mybrand', 'threads-mybrand', 'bluesky-mybrand'],
  text: 'Just shipped our new SDK! #socifyr',
  firstComment: { text: '#devtools #shipping', linkUrl: 'https://socifyr.com' },
  platformOptions: {
    'x-myhandle': { replySettings: 'EVERYONE' },
    'linkedin-mybrand': { visibility: 'PUBLIC' },
  },
})
```

### `uploads.document(params): Promise<Upload>`

Post a document (currently LinkedIn):

```typescript
const upload = await socifyr.uploads.document({
  connections: ['linkedin-mybrand'],
  medias: [fs.readFileSync('./whitepaper.pdf')],
  title: 'The 2026 Social Report',
  text: 'Our full analysis — worth the read.',
})
```

### Scheduling

Pass `scheduledAt` (ISO-8601) on any create call. `timezone` lets you pin a wall-clock time to a zone:

```typescript
const upload = await socifyr.uploads.text({
  connections: ['x-myhandle', 'linkedin-mybrand'],
  text: 'This post will go live tomorrow at 9am EST',
  scheduledAt: '2026-06-15T09:00:00.000Z',
  timezone: 'America/New_York',
})

// Publish immediately if plans change
await socifyr.uploads.publishNow(upload.id!)

// Or cancel it
await socifyr.uploads.cancel(upload.id!)
```

### `uploads.publishNow(id): Promise<Upload>`

Pull a scheduled post out of the queue and publish immediately:

```typescript
const ack = await socifyr.uploads.publishNow('6b1f0c2a...')
console.log(ack.requestId) // poll this for results
```

### `uploads.cancel(id): Promise<void>`

Delete a post (or cancel a scheduled one):

```typescript
await socifyr.uploads.cancel('6b1f0c2a...')
```

---

## Drafts

Save now, publish later:

```typescript
// 1. Save a draft (any create method accepts saveDraft)
const draft = await socifyr.uploads.photos({
  connections: ['instagram-mybrand'],
  medias: [fs.readFileSync('./photo.jpg')],
  text: 'Draft caption',
  saveDraft: true,
})
console.log(draft.id) // draft ID

// 2. Edit it — returns a { id: draftId } ack, not the full detail
await socifyr.uploads.update(draft.id!, {
  text: 'Final caption',
  connections: ['instagram-mybrand', 'facebook-mybrand'],
  scheduledAt: '2026-06-15T09:00:00.000Z',
})

// 3. Publish it — async ack: use requestId (or the draft ID) for polling
const ack = await socifyr.uploads.publishDraft(draft.id!)
console.log(ack.requestId, ack.totalChannels)
```

### `uploads.update(id, params): Promise<Upload>`

Update a draft's text, connections, schedule, media, or platform options. Only drafts can be updated:

```typescript
await socifyr.uploads.update('6b1f0c2a...', {
  title: 'New title',
  text: 'New caption',
  mediaIds: ['6a937894df74747da8fdb8ba'],
  platformOptions: { 'instagram-mybrand': { mediaType: 'REELS' } },
})
```

### `uploads.publishDraft(id): Promise<Upload>`

Publish a saved draft immediately. The ack is async-only (no `uploadId`) — poll with the draft ID or the returned `requestId`.

---

## Status & Polling

### `uploads.getStatus(idOrRequestId): Promise<UploadStatusResponse>`

Accepts **either** the content/upload ID **or** the `requestId` from any ack:

```typescript
const status = await socifyr.uploads.getStatus('9f2c7a1e-...')
console.log(status.status) // 'publishing'
for (const ch of status.channels) {
  console.log(ch.platform, ch.result?.status, ch.result?.postUrl, ch.result?.error)
}
```

Channel shape:

```typescript
{
  requestId: '9f2c7a1e-...',
  uploadId: '6b1f0c2a...',
  status: 'partial_failure',
  type: 'video',
  channels: [
    {
      platform: 'youtube',
      connectionId: '6a20...',
      targetName: 'My Brand Channel',
      result: {
        status: 'success',
        postId: '6zaztTmk3Ck',
        postUrl: 'https://youtube.com/shorts/6zaztTmk3Ck',
        publishedAt: '2026-09-12T10:04:11.000Z',
      },
    },
    {
      platform: 'instagram',
      connectionId: '6a21...',
      result: { status: 'failed', error: 'Requires instagram_content_publish permission' },
    },
  ],
  createdAt: '2026-09-12T10:03:58.000Z',
}
```

### `uploads.waitForCompletion(idOrRequestId, intervalMs?, timeoutMs?): Promise<UploadStatusResponse>`

Polls every 3s (default) until a terminal status (`completed`, `failed`, `partial_failure`) or timeout (5 min default):

```typescript
const result = await socifyr.uploads.waitForCompletion(upload.requestId!, 3000, 300000)
console.log(result.status)
```

---

## History & Lifecycle

### `uploads.list(query?): Promise<UploadListResponse>`

Paginated history. **Items live under `data`, pagination under `meta`**:

```typescript
const history = await socifyr.uploads.list({
  status: 'completed',
  platform: 'instagram',
  type: 'video',
  from: '2026-03-01',
  page: 1,
  limit: 50,
})

console.log(`Found ${history.meta.total} uploads, page ${history.meta.page} of ${history.meta.totalPages}`)
for (const upload of history.data) {
  console.log(upload.id, upload.status, upload.type, upload.mediaThumbnail?.url)
}
```

### `uploads.get(id): Promise<UploadDetail>`

Full detail for one post, including per-channel results:

```typescript
const detail = await socifyr.uploads.get('6b1f0c2a...')
console.log(detail.status, detail.channels.length, detail.scheduledAt)
```

### `uploads.retry(id): Promise<Upload>`

Re-queue only the **failed** channels of a partial/failed post:

```typescript
const ack = await socifyr.uploads.retry('6b1f0c2a...')
console.log(ack.retriedChannels) // 2 — number of channels re-queued
```

### `uploads.archive(id)` / `uploads.unarchive(id)`: `Promise<Upload>`

Hide a post from the history default view without deleting it. Both return `{ id: uploadId }` acks.

```typescript
await socifyr.uploads.archive('6b1f0c2a...')
await socifyr.uploads.unarchive('6b1f0c2a...')
```

### `uploads.bulkDelete(ids)` / `bulkArchive(ids)` / `bulkUnarchive(ids)`: `Promise<void>`

```typescript
await socifyr.uploads.bulkArchive(['6b1f...', '6b1f...', '6b1f...'])
```

---

## Media Library

Upload once, reuse across posts:

### `media.upload(file, filename?): Promise<MediaItem>`

```typescript
const media = await socifyr.media.upload(fs.readFileSync('./banner.png'), 'banner.png')
console.log(media.id, media.url, media.type) // '6a93...' 'https://cdn...' 'image'
```

### `media.list(query?): Promise<PaginatedResponse<MediaItem>>`

Items under `results`:

```typescript
const images = await socifyr.media.list({
  type: 'image',          // 'image' | 'video' | 'document'
  search: 'launch',
  page: 1,
  limit: 20,
  sortBy: 'createdAt',    // or 'name'
  sortOrder: 'desc',
})
console.log(images.results.length, 'of', images.total)
```

### `media.get(id): Promise<MediaItem>`

```typescript
const item = await socifyr.media.get('6a937894df74747da8fdb8ba')
console.log(item.name, item.mimeType, item.sizeBytes)
```

### `media.update(id, metadata): Promise<MediaItem>`

```typescript
await socifyr.media.update('6a937894df74747da8fdb8ba', {
  alt: 'Product launch banner',
  description: 'Hero image from the June campaign',
  tags: ['launch', 'q2-2026'],
})
```

### `media.delete(id)` / `media.bulkDelete(ids)`: `Promise<void>`

```typescript
await socifyr.media.delete('6a937894df74747da8fdb8ba')
await socifyr.media.bulkDelete(['6a93...', '6a93...'])
```

---

## AI

### `ai.status(): Promise<AiStatus>`

```typescript
const { available } = await socifyr.ai.status()
if (!available) console.log('AI features are disabled for this workspace')
```

### `ai.generateContent(params): Promise<GeneratedContent>`

Generates a platform-optimized caption per platform. `platforms` takes **platform type enums** (not connection slugs):

```typescript
const content = await socifyr.ai.generateContent({
  uploadType: 'video',                 // 'video' | 'photo' | 'text' | 'document'
  platforms: ['instagram', 'linkedin', 'x'],
  title: 'Product Launch Demo',
  description: 'A 30-second tour of the new dashboard',
  tone: 'professional',                // 'professional' | 'casual' | 'humorous' | 'inspirational' | 'informative'
  brandVoice: 'We speak with authority but stay approachable',
})

for (const [platform, caption] of Object.entries(content.content)) {
  console.log(`[${platform}] ${caption}`)
}
// [instagram] Something visual with hashtags...
// [linkedin] A longer, professional angle...
// [x] One tight sentence...
```

### `ai.suggestHashtags(params): Promise<SuggestedHashtags[]>`

```typescript
const suggestions = await socifyr.ai.suggestHashtags({
  text: 'Launching our social media automation SDK',
  platforms: ['instagram', 'x'],
  count: 15,
  existingHashtags: ['#socifyr'],
})
for (const s of suggestions) {
  console.log(s.platform, s.hashtags.join(' '))
}
```

---

## Analytics

### `analytics.get(query?): Promise<Analytics>`

```typescript
const stats = await socifyr.analytics.get({
  from: '2026-01-01',
  to: '2026-03-31',
  granularity: 'weekly',   // 'daily' | 'weekly' | 'monthly'
  platform: 'instagram',   // optional filter
})

console.log(stats.summary.totalLikes, stats.summary.totalImpressions)
console.log(`${stats.summary.avgEngagementRate}% engagement`)
for (const p of stats.platformBreakdown) {
  console.log(p.platform, p.published, p.avgEngagementRate)
}
```

### `analytics.followers(query?): Promise<FollowerGrowth>`

Follower growth per connected account (daily snapshots). `query`: `period`, `from`, `to`, `connection` (slug), `platform`. Defaults to the last 30 days.

```typescript
const { totals, accounts } = await socifyr.analytics.followers({ period: 'last_3months' })
```

### `analytics.accounts(query?): Promise<AccountComparison>`

Side-by-side comparison of connected accounts: followers and change, posts, engagement, engagement rate and per-follower engagement. Same query as `followers`.

```typescript
const { accounts } = await socifyr.analytics.accounts({ period: 'last_month' })
```

### `analytics.sync(): Promise<AnalyticsSyncResult>`

Manually trigger a metrics sync from all connected platforms:

```typescript
await socifyr.analytics.sync()
```

### `analytics.getPost(idOrRequestId): Promise<PostAnalytics>`

Per-post engagement across platforms:

```typescript
const post = await socifyr.analytics.getPost('6b1f0c2a...')
for (const ch of post.platforms) {
  console.log(ch.platform, ch.status, ch.postUrl)
  if (ch.engagement) {
    console.log(' ', ch.engagement.likes, 'likes,', ch.engagement.impressions, 'impressions')
  }
}
```

### `analytics.getPlatformMetrics(): Promise<PlatformMetric[]>`

Which metrics each platform exposes (for building UIs):

```typescript
for (const m of await socifyr.analytics.getPlatformMetrics()) {
  console.log(m.platform, m.primaryImpression, m.metrics)
}
```

---

## Engagement

### `engagement.backfill(): Promise<{ enqueued: number }>`

Enqueue engagement fetches for posts that never collected metrics:

```typescript
const result = await socifyr.engagement.backfill()
console.log(`${result.enqueued} fetch jobs enqueued`)
```

---

## Webhooks

### Managing webhooks

```typescript
// Register — store webhook.secret for signature verification
const webhook = await socifyr.webhooks.create({
  url: 'https://myapp.com/webhooks/socifyr',
  events: ['upload.completed', 'upload.failed', 'platform.success'],
  description: 'Production webhook',
})

// List / inspect
const hooks = await socifyr.webhooks.list()
const one = await socifyr.webhooks.get(webhook.id)

// Pause without deleting
await socifyr.webhooks.update(webhook.id, { active: false })

// Last 50 delivery attempts (payloads, status codes, responses)
const deliveries = await socifyr.webhooks.deliveries(webhook.id)
const failed = deliveries.filter((d) => d.status === 'failed')

// Remove
await socifyr.webhooks.delete(webhook.id)
```

### Verifying signatures

Socifyr sends `X-Webhook-Signature: sha256=<hex>` — an HMAC-SHA256 of the **raw request body** using the webhook's secret. Verify with the exported helper (raw body, no timestamp component):

```typescript
import { verifyWebhookSignature, parseWebhookEvent } from '@socifyr/sdk'
import express from 'express'

const app = express()

// IMPORTANT: capture the raw body before any JSON parsing
app.post(
  '/webhooks/socifyr',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const isValid = verifyWebhookSignature(
      req.body,                                  // raw Buffer or string
      req.headers['x-webhook-signature'] as string, // "sha256=<hex>"
      process.env.WEBHOOK_SECRET!,              // from webhook.secret
    )
    if (!isValid) return res.status(401).send('Invalid signature')

    const event = parseWebhookEvent(req.body)
    switch (event.event) {
      case 'upload.completed':
        console.log('Upload done:', event.payload.uploadId)
        break
      case 'upload.failed':
        console.error('Upload failed:', event.payload.error)
        break
      case 'platform.success':
        console.log('Published to', event.payload.platform, event.payload.postUrl)
        break
    }
    res.sendStatus(200)
  },
)
```

Payload shape (`event.event` / `event.payload` — not `type`/`data`):

```json
{
  "event": "platform.success",
  "payload": { "uploadId": "6b1f...", "platform": "youtube", "postUrl": "https://..." },
  "timestamp": "2026-09-12T10:04:11.000Z",
  "deliveryId": "6d0a..."
}
```

| Event                    | Description                            |
| ------------------------ | -------------------------------------- |
| `upload.completed`       | All platforms published successfully   |
| `upload.failed`          | Upload failed entirely                 |
| `upload.partial_failure` | Some platforms failed                  |
| `platform.success`       | Single platform published successfully |
| `platform.failed`        | Single platform publish failed         |

The payload carries `timestamp` and a unique `deliveryId` — use them for replay-window checks if you need them.

---

## Workspaces

Connection, member, invitation and API key methods act on the workspace the API key belongs to, so they take no workspace ID.

### Workspace CRUD

```typescript
const current = await socifyr.workspaces.get() // the API key's workspace
const ws = await socifyr.workspaces.create({ name: 'Marketing Team' })
const all = await socifyr.workspaces.list()
const one = await socifyr.workspaces.get(ws.id)
await socifyr.workspaces.update(ws.id, { name: 'Marketing' })
await socifyr.workspaces.delete(ws.id) // cannot be your last workspace
```

### Connections

```typescript
// List connected accounts (slugs used for posting)
const connections = await socifyr.workspaces.listConnections()

// Disconnect every account for a platform (other platforms untouched)
await socifyr.workspaces.disconnectPlatform('instagram')

// Disconnect AND revoke OAuth tokens server-side
await socifyr.workspaces.revokePlatform('instagram')

// Switch which page/account a platform posts to (e.g. Facebook page)
await socifyr.workspaces.updatePlatformTarget('facebook', {
  targetId: '17841400012345678',
  targetName: 'My Brand Page',
})

// Single-connection variants (leave sibling connections intact)
await socifyr.workspaces.deleteConnection(connectionId)
await socifyr.workspaces.revokeConnection(connectionId)

// Fork a page-based connection (Facebook/Instagram) into a connection for
// another page under the same OAuth grant
const forked = await socifyr.workspaces.forkConnection(connectionId, {
  targetId: '1004860882719628',
  targetName: 'Second Brand Page',
  targetImageUrl: 'https://cdn.../page-avatar.png', // optional
})

// Switch the page/account a single connection posts to
await socifyr.workspaces.updateConnectionTarget(connectionId, {
  targetId: '1004860882719628',
  targetName: 'Second Brand Page',
})

// Refresh OAuth tokens for a connection (e.g. platform reported expiry)
await socifyr.workspaces.refreshConnection('instagram-mybrand')
```

### Members

```typescript
const members = await socifyr.workspaces.listMembers()
// [{ userId, email, name, role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'CONTRIBUTOR', joinedAt }]

await socifyr.workspaces.updateMemberRole('user_456', 'EDITOR')
await socifyr.workspaces.removeMember('user_456')
```

### Invitations

```typescript
const invitation = await socifyr.workspaces.invite({
  email: 'alice@company.com',
  roleKey: 'EDITOR', // 'ADMIN' | 'EDITOR' | 'CONTRIBUTOR' (never 'OWNER')
})

const pending = await socifyr.workspaces.listInvitations()
await socifyr.workspaces.cancelInvitation(invitation.id)
```

### API Keys

```typescript
const keys = await socifyr.workspaces.listApiKeys()
// [{ id, label, prefix, createdAt, lastUsedAt }]

const key = await socifyr.workspaces.createApiKey({ label: 'CI/CD Pipeline' })
console.log('Save this key:', key.key) // sk_... — shown only once

await socifyr.workspaces.deleteApiKey(key.id)
```

---

## Per-Platform Options

Override content per connection (or per platform name) via `platformOptions`:

```typescript
await socifyr.uploads.video({
  connections: ['instagram-mybrand', 'tiktok-mybrand', 'facebook-mybrand', 'linkedin-mybrand', 'x-myhandle'],
  medias: [videoBuffer],
  title: 'Default title',

  platformOptions: {
    'instagram-mybrand': {
      mediaType: 'REELS',                  // 'REELS' | 'STORIES' | 'FEED'
      title: 'Instagram-specific title',
      coverUrl: 'https://example.com/cover.jpg',
    },
    'tiktok-mybrand': {
      privacyLevel: 'PUBLIC_TO_EVERYONE',  // | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'
      disableDuet: false,
      disableComment: false,
      disableStitch: false,
    },
    'facebook-mybrand': {
      mediaType: 'REELS',                  // 'FEED_VIDEO' | 'STORIES' | 'REELS'
      pageId: '1004860882719628',
    },
    'linkedin-mybrand': {
      visibility: 'PUBLIC',                // 'PUBLIC' | 'CONNECTIONS'
      description: 'LinkedIn-optimized description',
    },
    'x-myhandle': {
      replySettings: 'EVERYONE',           // 'EVERYONE' | 'FOLLOWERS' | 'MENTIONED_USERS'
      text: 'Shorter text for X',
    },
  },
})
```

Keys may be connection slugs, connection ObjectIds, or platform names for a platform-wide override. Every platform also accepts `title`, `description`, `text`, `firstComment`, and `linkUrl` overrides.

## Error Handling

The SDK throws typed errors you can catch specifically:

```typescript
import {
  Socifyr,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  UsageLimitError,
  NotFoundError,
  PermissionError,
} from '@socifyr/sdk'

try {
  await socifyr.uploads.text({ connections: ['x-myhandle'], text: '...' })
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 — invalid API key
  } else if (error instanceof ValidationError) {
    // 400 — check error.errors for field-level details
    console.log(error.errors) // { connections: ['must not be empty'] }
  } else if (error instanceof RateLimitError) {
    // 429 — retry after error.retryAfter seconds
    await sleep(error.retryAfter * 1000)
  } else if (error instanceof UsageLimitError) {
    // 402 — monthly upload limit reached, upgrade plan
  } else if (error instanceof PermissionError) {
    // 403 — insufficient workspace role
  } else if (error instanceof NotFoundError) {
    // 404 — resource not found
  }
}
```

## Supported Platforms

| Platform    | Video                | Photo    | Text | Document |
| ----------- | -------------------- | -------- | ---- | -------- |
| Instagram   | REELS, STORIES, FEED | Carousel | -    | -        |
| Facebook    | FEED, STORIES, REELS | Feed     | Feed | -        |
| X (Twitter) | Feed                 | Feed     | Feed | -        |
| LinkedIn    | Feed                 | Feed     | Feed | Document |
| TikTok      | Feed                 | -        | -    | -        |
| YouTube     | Feed, Shorts         | -        | -    | -        |
| Threads     | -                    | Feed     | Feed | -        |
| Pinterest   | Video Pin            | Pin      | -    | -        |
| Reddit      | -                    | -        | Text | -        |
| Bluesky     | -                    | Feed     | Feed | -        |

## Requirements

- Node.js 18+ (uses native `fetch` and `FormData`)
- TypeScript 5+ (for best type inference)

## License

AGPL-3.0-or-later
