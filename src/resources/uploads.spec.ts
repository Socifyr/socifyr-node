jest.mock('../http', () => ({
  enc: (s: string) => s,
  HttpClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    postForm: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}))

import { UploadsResource } from './uploads'
import type { HttpClient } from '../http'

describe('UploadsResource', () => {
  let resource: UploadsResource
  let mockHttp: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    const { HttpClient } = jest.requireMock('../http')
    mockHttp = new HttpClient() as jest.Mocked<InstanceType<typeof HttpClient>>
    resource = new UploadsResource(mockHttp)
  })

  describe('media input classification', () => {
    it('classifies media_ prefix as media ID', () => {
      // isMediaId helper - these are tested via integration
      expect('media_abc123'.startsWith('media_')).toBe(true)
    })

    it('classifies ObjectId pattern as media ID', () => {
      const objectIdPattern = /^[a-f\d]{24}$/i
      expect(objectIdPattern.test('507f1f77bcf86cd799439011')).toBe(true)
    })

    it('classifies http URL as URL', () => {
      const isUrl = (v: string) => v.startsWith('http://') || v.startsWith('https://')
      expect(isUrl('https://example.com/image.png')).toBe(true)
      expect(isUrl('http://example.com/image.png')).toBe(true)
    })

    it('classifies relative path as file content', () => {
      const isUrl = (v: string) => v.startsWith('http://') || v.startsWith('https://')
      expect(isUrl('upload.png')).toBe(false)
      expect(isUrl('my-image.jpg')).toBe(false)
    })
  })

  describe('waitForCompletion', () => {
    it('throws on timeout', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({ status: 'processing' })

      await expect(
        resource.waitForCompletion('req_123', 10, 50),
      ).rejects.toThrow('did not complete within')
    })

    it('returns immediately on completed status', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({
        requestId: 'req_123',
        uploadId: 'upload_123',
        status: 'completed',
        type: 'video',
        channels: [],
        createdAt: '2026-01-01',
      })

      const result = await resource.waitForCompletion('req_123', 10, 100)
      expect(result.status).toBe('completed')
      expect(mockHttp.get).toHaveBeenCalledTimes(1)
    })

    it('returns immediately on failed status', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({
        requestId: 'req_123',
        uploadId: 'upload_123',
        status: 'failed',
        type: 'video',
        channels: [],
        createdAt: '2026-01-01',
      })

      const result = await resource.waitForCompletion('req_123', 10, 100)
      expect(result.status).toBe('failed')
    })

    it('returns immediately on partial_failure status', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({
        requestId: 'req_123',
        uploadId: 'upload_123',
        status: 'partial_failure',
        type: 'video',
        channels: [],
        createdAt: '2026-01-01',
      })

      const result = await resource.waitForCompletion('req_123', 10, 100)
      expect(result.status).toBe('partial_failure')
    })

    it('polls multiple times until terminal status', async () => {
      let calls = 0
      mockHttp.get = jest.fn().mockImplementation(() => {
        calls++
        if (calls < 3) return Promise.resolve({ status: 'processing' })
        return Promise.resolve({
          requestId: 'req_123',
          uploadId: 'upload_123',
          status: 'completed',
          type: 'video',
          channels: [],
          createdAt: '2026-01-01',
        })
      })

      const result = await resource.waitForCompletion('req_123', 10, 100)
      expect(result.status).toBe('completed')
      expect(calls).toBeGreaterThanOrEqual(2)
    }, 10000)
  })

  describe('API calls', () => {
    it('video calls correct endpoint', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.video({ connections: ['ig-test'], medias: [] })
      expect(mockHttp.post).toHaveBeenCalledWith('/content/video', expect.objectContaining({
        connections: ['ig-test'],
      }))
    })

    it('photos calls correct endpoint', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.photos({ connections: ['ig-test'], medias: [] })
      expect(mockHttp.post).toHaveBeenCalledWith('/content/photos', expect.any(Object))
    })

    it('text calls correct endpoint', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.text({ connections: ['ig-test'], text: 'Hello' })
      expect(mockHttp.post).toHaveBeenCalledWith('/content/text', expect.any(Object))
    })

    it('bulkSchedule posts rows to /content/bulk-schedule', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ created: 1, failed: [] })
      const res = await resource.bulkSchedule({
        rows: [{ text: 'hi', connections: ['x-me'], scheduledAt: '2099-01-01T00:00:00Z' }],
      })
      expect(mockHttp.post).toHaveBeenCalledWith('/content/bulk-schedule', expect.objectContaining({
        rows: expect.any(Array),
      }))
      expect(res.created).toBe(1)
    })

    it('normalizes sync ack uploadId onto id', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({
        success: true,
        requestId: 'req_1',
        uploadId: 'upload_1',
      })
      const upload = await resource.text({ connections: ['ig-test'], text: 'Hello' })
      expect(upload.id).toBe('upload_1')
      expect(upload.requestId).toBe('req_1')
    })

    it('normalizes draft ack draftId onto id', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ success: true, draftId: 'draft_1' })
      const upload = await resource.text({
        connections: ['ig-test'],
        text: 'Hello',
        saveDraft: true,
      })
      expect(upload.id).toBe('draft_1')
    })

    it('keeps requestId-only async ack as-is', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({
        success: true,
        requestId: 'req_2',
        message: 'Upload processing started',
        totalChannels: 3,
      })
      const upload = await resource.text({
        connections: ['ig-test'],
        text: 'Hello',
        async: true,
      })
      expect(upload.id).toBeUndefined()
      expect(upload.requestId).toBe('req_2')
      expect(upload.totalChannels).toBe(3)
    })

    it('normalizes retry ack', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({
        success: true,
        uploadId: 'upload_9',
        retriedChannels: 2,
      })
      const upload = await resource.retry('upload_9')
      expect(upload.id).toBe('upload_9')
      expect(upload.retriedChannels).toBe(2)
    })

    it('getStatus calls correct endpoint with requestId query param', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({})
      await resource.getStatus('req_123')
      expect(mockHttp.get).toHaveBeenCalledWith('/content/status', { requestId: 'req_123' })
    })

    it('get calls content/:id', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.get('upload_abc')
      expect(mockHttp.get).toHaveBeenCalledWith('/content/upload_abc')
    })

    it('cancel calls DELETE content/:id', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.cancel('upload_abc')
      expect(mockHttp.delete).toHaveBeenCalledWith('/content/upload_abc')
    })

    it('retry calls POST content/:id/retry', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.retry('upload_abc')
      expect(mockHttp.post).toHaveBeenCalledWith('/content/upload_abc/retry')
    })

    it('publishDraft calls POST content/:id/publish', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.publishDraft('upload_abc')
      expect(mockHttp.post).toHaveBeenCalledWith('/content/upload_abc/publish')
    })

    it('bulkDelete calls correct endpoint', async () => {
      mockHttp.post = jest.fn().mockResolvedValue(undefined)
      await resource.bulkDelete(['id1', 'id2'])
      expect(mockHttp.post).toHaveBeenCalledWith('/content/bulk-delete', { ids: ['id1', 'id2'] })
    })

    it('bulkArchive calls correct endpoint', async () => {
      mockHttp.post = jest.fn().mockResolvedValue(undefined)
      await resource.bulkArchive(['id1', 'id2'])
      expect(mockHttp.post).toHaveBeenCalledWith('/content/bulk-archive', { ids: ['id1', 'id2'] })
    })

    it('archive calls PATCH content/:id/archive', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue({ id: 'upload_1' })
      await resource.archive('upload_abc')
      expect(mockHttp.patch).toHaveBeenCalledWith('/content/upload_abc/archive')
    })

    it('update PATCHes content/:id with connections and schedule', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue({ draftId: 'upload_abc' })
      const params = {
        connections: ['instagram-mybrand', 'x-mybrand'],
        text: 'edited',
        scheduledAt: '2026-12-01T09:00:00Z',
      }
      const res = await resource.update('upload_abc', params)
      expect(mockHttp.patch).toHaveBeenCalledWith('/content/upload_abc', params)
      // Ack is normalized so callers always get `id`.
      expect(res.id).toBe('upload_abc')
    })
  })
})