import { enc, type HttpClient } from '../http'
import type {
  Upload,
  UploadDetail,
  UploadListResponse,
  UploadVideoParams,
  UploadPhotosParams,
  UploadTextParams,
  UploadDocumentParams,
  UpdateDraftParams,
  UploadStatusResponse,
  UploadHistoryQuery,
  MediaInput,
  MediaItem,
  BulkScheduleParams,
  BulkScheduleResult,
} from '../types'

function isMediaId(value: MediaInput): boolean {
  return typeof value === 'string' && (value.startsWith('media_') || /^[a-f\d]{24}$/i.test(value))
}

function isUrl(value: MediaInput): boolean {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))
}

export class UploadsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create endpoints return `{ requestId, uploadId }` (immediate/scheduled),
   * `{ draftId }` (saveDraft), or `{ requestId, message, totalChannels }` (async).
   * Normalize `uploadId`/`draftId` onto `id` so callers always have one field.
   */
  private normalizeAck(res: Record<string, unknown>): Upload {
    return { ...res, id: (res.uploadId ?? res.draftId ?? res.id) as string | undefined }
  }

  private async resolveMedias(
    medias: MediaInput[],
    uploadFn: (file: Buffer | Blob, filename?: string) => Promise<MediaItem>,
  ): Promise<string[]> {
    const resolved: string[] = []

    for (const media of medias) {
      if (typeof media === 'string') {
        if (isMediaId(media) || isUrl(media)) {
          resolved.push(media)
        } else {
          const item = await uploadFn(Buffer.from(media), 'upload')
          resolved.push(item.id)
        }
      } else {
        const buffer =
          media instanceof Buffer ? media : Buffer.from(media as unknown as ArrayBuffer)
        const item = await uploadFn(buffer, 'upload')
        resolved.push(item.id)
      }
    }

    return resolved
  }

  async video(params: UploadVideoParams): Promise<Upload> {
    const { medias, ...options } = params

    const mediaUpload = async (file: Buffer | Blob, filename?: string): Promise<MediaItem> => {
      const form = new FormData()
      const blob = file instanceof Blob ? file : new Blob([file as unknown as BlobPart])
      form.append('file', blob, filename)
      return this.http.postForm<MediaItem>('/media/upload', form)
    }

    const resolvedMedias = medias?.length
      ? await this.resolveMedias(medias, mediaUpload)
      : undefined

    const res = await this.http.post<Record<string, unknown>>('/content/video', {
      ...options,
      medias: resolvedMedias,
    })
    return this.normalizeAck(res)
  }

  async photos(params: UploadPhotosParams): Promise<Upload> {
    const { medias, ...options } = params

    const mediaUpload = async (file: Buffer | Blob, filename?: string): Promise<MediaItem> => {
      const form = new FormData()
      const blob = file instanceof Blob ? file : new Blob([file as unknown as BlobPart])
      form.append('file', blob, filename)
      return this.http.postForm<MediaItem>('/media/upload', form)
    }

    const resolvedMedias = medias?.length
      ? await this.resolveMedias(medias, mediaUpload)
      : undefined

    const res = await this.http.post<Record<string, unknown>>('/content/photos', {
      ...options,
      medias: resolvedMedias,
    })
    return this.normalizeAck(res)
  }

  async text(params: UploadTextParams): Promise<Upload> {
    const res = await this.http.post<Record<string, unknown>>('/content/text', params)
    return this.normalizeAck(res)
  }

  /**
   * Schedule many text posts at once — pass `rows` or a `csv` string
   * (header: text,connections,scheduledAt,title). Returns a created count and
   * per-row errors; one bad row never aborts the batch.
   *
   * @example
   * ```ts
   * const res = await socifyr.uploads.bulkSchedule({
   *   rows: [
   *     { text: 'Morning post', connections: ['x-me'], scheduledAt: '2026-06-01T09:00:00Z' },
   *     { text: 'Evening post', connections: ['x-me'], scheduledAt: '2026-06-01T18:00:00Z' },
   *   ],
   * })
   * console.log(`${res.created} scheduled, ${res.failed.length} failed`)
   * ```
   */
  async bulkSchedule(params: BulkScheduleParams): Promise<BulkScheduleResult> {
    return this.http.post('/content/bulk-schedule', params)
  }

  async document(params: UploadDocumentParams): Promise<Upload> {
    const { medias, ...options } = params

    const mediaUpload = async (file: Buffer | Blob, filename?: string): Promise<MediaItem> => {
      const form = new FormData()
      const blob = file instanceof Blob ? file : new Blob([file as unknown as BlobPart])
      form.append('file', blob, filename)
      return this.http.postForm<MediaItem>('/media/upload', form)
    }

    const resolvedMedias = medias?.length
      ? await this.resolveMedias(medias, mediaUpload)
      : undefined

    const res = await this.http.post<Record<string, unknown>>('/content/document', {
      ...options,
      medias: resolvedMedias,
    })
    return this.normalizeAck(res)
  }

  async getStatus(requestId: string): Promise<UploadStatusResponse> {
    return this.http.get('/content/status', { requestId })
  }

  async waitForCompletion(
    requestId: string,
    intervalMs = 3000,
    timeoutMs = 300_000,
  ): Promise<UploadStatusResponse> {
    const terminal = new Set(['completed', 'failed', 'partial_failure'])
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const status = await this.getStatus(requestId)
      if (terminal.has(status.status)) return status
      await new Promise((r) => setTimeout(r, intervalMs))
    }

    throw new Error(`Upload ${requestId} did not complete within ${timeoutMs}ms`)
  }

  /** List upload history. Items live under `data`, pagination under `meta.totalPages`. */
  async list(query: UploadHistoryQuery = {}): Promise<UploadListResponse> {
    return this.http.get('/content', query as Record<string, unknown>)
  }

  async get(id: string): Promise<UploadDetail> {
    return this.http.get(`/content/${enc(id)}`)
  }

  async cancel(id: string): Promise<void> {
    return this.http.delete(`/content/${enc(id)}`)
  }

  async publishNow(id: string): Promise<Upload> {
    const res = await this.http.post<Record<string, unknown>>(
      `/content/${enc(id)}/publish-now`,
    )
    return this.normalizeAck(res)
  }

  /** Update a draft — returns `{ id: draftId }` ack, not the full detail. */
  async update(id: string, params: UpdateDraftParams): Promise<Upload> {
    const res = await this.http.patch<Record<string, unknown>>(
      `/content/${enc(id)}`,
      params,
    )
    return this.normalizeAck(res)
  }

  async retry(id: string): Promise<Upload> {
    const res = await this.http.post<Record<string, unknown>>(
      `/content/${enc(id)}/retry`,
    )
    return this.normalizeAck(res)
  }

  async publishDraft(id: string): Promise<Upload> {
    const res = await this.http.post<Record<string, unknown>>(
      `/content/${enc(id)}/publish`,
    )
    return this.normalizeAck(res)
  }

  async bulkDelete(ids: string[]): Promise<void> {
    return this.http.post('/content/bulk-delete', { ids })
  }

  async bulkArchive(ids: string[]): Promise<void> {
    return this.http.post('/content/bulk-archive', { ids })
  }

  async bulkUnarchive(ids: string[]): Promise<void> {
    return this.http.post('/content/bulk-unarchive', { ids })
  }

  async archive(id: string): Promise<Upload> {
    const res = await this.http.patch<Record<string, unknown>>(
      `/content/${enc(id)}/archive`,
    )
    return this.normalizeAck(res)
  }

  async unarchive(id: string): Promise<Upload> {
    const res = await this.http.patch<Record<string, unknown>>(
      `/content/${enc(id)}/unarchive`,
    )
    return this.normalizeAck(res)
  }
}
