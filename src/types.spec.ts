import {
  PLATFORMS,
  WEBHOOK_EVENTS,
  type Platform,
  type UploadType,
  type UploadStatus,
  type WebhookEvent,
  type MediaType,
  type WorkspaceRole,
  type InvitableRole,
} from './types'

describe('PLATFORMS', () => {
  it('contains all expected platforms', () => {
    expect(PLATFORMS).toContain('instagram')
    expect(PLATFORMS).toContain('facebook')
    expect(PLATFORMS).toContain('x')
    expect(PLATFORMS).toContain('linkedin')
    expect(PLATFORMS).toContain('tiktok')
    expect(PLATFORMS).toContain('youtube')
    expect(PLATFORMS).toContain('threads')
    expect(PLATFORMS).toContain('pinterest')
    expect(PLATFORMS).toContain('reddit')
    expect(PLATFORMS).toContain('bluesky')
    expect(PLATFORMS).toContain('telegram')
    expect(PLATFORMS).toContain('discord')
    expect(PLATFORMS).toContain('mastodon')
    expect(PLATFORMS).toContain('nostr')
    expect(PLATFORMS).toContain('slack')
    expect(PLATFORMS).toHaveLength(18)
  })

  it('is readonly tuple', () => {
    expect(PLATFORMS.length).toBe(18)
  })
})

describe('WEBHOOK_EVENTS', () => {
  it('contains all expected events', () => {
    expect(WEBHOOK_EVENTS).toContain('upload.completed')
    expect(WEBHOOK_EVENTS).toContain('upload.failed')
    expect(WEBHOOK_EVENTS).toContain('upload.partial_failure')
    expect(WEBHOOK_EVENTS).toContain('platform.success')
    expect(WEBHOOK_EVENTS).toContain('platform.failed')
    expect(WEBHOOK_EVENTS).toHaveLength(5)
  })
})

describe('type aliases', () => {
  it('Platform is a string', () => {
    const platform: Platform = 'instagram'
    expect(platform).toBe('instagram')
  })

  it('UploadType accepts valid values', () => {
    const types: UploadType[] = ['video', 'photo', 'text', 'document']
    expect(types).toHaveLength(4)
  })

  it('UploadStatus accepts valid values', () => {
    const statuses: UploadStatus[] = [
      'draft',
      'pending',
      'queued',
      'processing',
      'publishing',
      'completed',
      'partial_failure',
      'failed',
    ]
    expect(statuses).toHaveLength(8)
  })

  it('WebhookEvent is derived from WEBHOOK_EVENTS', () => {
    const event: WebhookEvent = 'upload.completed'
    expect(event).toBe('upload.completed')
  })

  it('MediaType accepts valid values', () => {
    const types: MediaType[] = ['image', 'video', 'document']
    expect(types).toHaveLength(3)
  })

  it('WorkspaceRole has correct values', () => {
    const roles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR']
    expect(roles).toHaveLength(4)
  })

  it('InvitableRole excludes OWNER', () => {
    const roles: InvitableRole[] = ['ADMIN', 'EDITOR', 'CONTRIBUTOR']
    expect(roles).toHaveLength(3)
  })
})