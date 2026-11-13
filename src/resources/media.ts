import { enc, type HttpClient } from '../http'
import type {
  MediaItem,
  MediaQuery,
  MediaMetadata,
  PaginatedResponse,
} from '../types'

export class MediaResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Upload a file to the media library for reuse across uploads.
   *
   * @example
   * ```ts
   * const media = await socifyr.media.upload(fs.readFileSync('./banner.png'), 'banner.png')
   * await socifyr.uploads.photos({
   *   connections: ['instagram-mybrand'],
   *   medias: [media.id],
   * })
   * ```
   */
  async upload(
    file: Buffer | Blob,
    filename?: string,
  ): Promise<MediaItem> {
    const form = new FormData()
    const blob = file instanceof Blob ? file : new Blob([file as unknown as BlobPart])
    form.append('file', blob, filename)
    return this.http.postForm('/media/upload', form)
  }

  /**
   * List media items with filtering and pagination.
   *
   * @example
   * ```ts
   * const images = await socifyr.media.list({ type: 'image', limit: 50 })
   * ```
   */
  async list(query: MediaQuery = {}): Promise<PaginatedResponse<MediaItem>> {
    return this.http.get('/media', query as Record<string, unknown>)
  }

  /**
   * Get a single media item by ID.
   */
  async get(id: string): Promise<MediaItem> {
    return this.http.get(`/media/${enc(id)}`)
  }

  /**
   * Update media metadata (alt text, description, tags).
   *
   * @example
   * ```ts
   * await socifyr.media.update('media_123', {
   *   alt: 'Product launch banner',
   *   tags: ['launch', 'product', '2026'],
   * })
   * ```
   */
  async update(id: string, metadata: MediaMetadata): Promise<MediaItem> {
    return this.http.post(`/media/${enc(id)}`, metadata)
  }

  /**
   * Delete a single media item.
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/media/${enc(id)}`)
  }

  /**
   * Delete multiple media items at once.
   *
   * @example
   * ```ts
   * await socifyr.media.bulkDelete(['media_1', 'media_2', 'media_3'])
   * ```
   */
  async bulkDelete(ids: string[]): Promise<void> {
    return this.http.post('/media/bulk-delete', { ids })
  }
}
