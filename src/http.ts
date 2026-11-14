import type { ApiResponse, SocifyrConfig } from './types'
import {
  SocifyrError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  UsageLimitError,
  ValidationError,
} from './errors'

const DEFAULT_API_URL = 'https://api.socifyr.com/api'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 2
const RETRYABLE_STATUS_CODES = new Set([408, 500, 502, 503, 504])
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Encode a user-supplied value for safe use in URL path segments */
export function enc(segment: string): string {
  return encodeURIComponent(segment)
}

export class HttpClient {
  private readonly apiKey: string
  private readonly apiUrl: string
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(config: SocifyrConfig) {
    this.apiKey = config.apiKey
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, '')
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
  }

  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path, query)
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  }

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: 'POST',
      body: formData,
    })
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  }

  /** Encode a user-supplied value for safe use in URL path segments */
  static encodeSegment(value: string): string {
    return encodeURIComponent(value)
  }

  async delete<T = void>(path: string): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, { method: 'DELETE' })
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.apiUrl}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value != null) {
          url.searchParams.set(key, String(value))
        }
      }
    }
    return url.toString()
  }

  private async request<T>(url: string, init: RequestInit, attempt = 0): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${this.apiKey}`)
    headers.set('Accept', 'application/json')

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        return this.handleError(response, url, init, attempt)
      }

      if (response.status === 204) {
        return undefined as T
      }

      const json = (await response.json()) as ApiResponse<T>
      return json.data as T
    } catch (error) {
      if (error instanceof SocifyrError) throw error

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (this.canRetry(init, attempt)) {
          await this.backoff(attempt)
          return this.request<T>(url, init, attempt + 1)
        }
        throw new SocifyrError('Request timed out', 408, 'timeout')
      }

      if (this.canRetry(init, attempt)) {
        await this.backoff(attempt)
        return this.request<T>(url, init, attempt + 1)
      }

      throw new SocifyrError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
        0,
        'network_error',
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async handleError<T>(
    response: Response,
    url: string,
    init: RequestInit,
    attempt: number,
  ): Promise<T> {
    const body = await response.text()
    let message = `HTTP ${response.status}`
    let errors: Record<string, string[]> = {}

    try {
      const json = JSON.parse(body)
      message = json.error ?? json.message ?? message
      if (json.errors) errors = json.errors
    } catch {
      // non-JSON error body
    }

    if (RETRYABLE_STATUS_CODES.has(response.status) && this.canRetry(init, attempt)) {
      await this.backoff(attempt)
      return this.request<T>(url, init, attempt + 1)
    }

    switch (response.status) {
      case 400:
        throw new ValidationError(message, errors)
      case 401:
        throw new AuthenticationError(message)
      case 402:
        throw new UsageLimitError(message)
      case 403:
        throw new PermissionError(message)
      case 404:
        throw new NotFoundError(message)
      case 429: {
        const retryAfter = parseInt(response.headers.get('retry-after') ?? '60', 10)
        throw new RateLimitError(retryAfter)
      }
      default:
        throw new SocifyrError(message, response.status, 'api_error')
    }
  }

  private canRetry(init: RequestInit, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false
    const method = (init.method ?? 'GET').toUpperCase()
    return SAFE_METHODS.has(method)
  }

  private backoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * 2 ** attempt, 10_000)
    const jitter = delay * 0.2 * Math.random()
    return new Promise((resolve) => setTimeout(resolve, delay + jitter))
  }
}
