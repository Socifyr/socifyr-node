export class SocifyrError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
  ) {
    super(message)
    this.name = 'SocifyrError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export class AuthenticationError extends SocifyrError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'authentication_error')
    this.name = 'AuthenticationError'
  }
}

export class PermissionError extends SocifyrError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'permission_error')
    this.name = 'PermissionError'
  }
}

export class NotFoundError extends SocifyrError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends SocifyrError {
  readonly errors: Record<string, string[]>

  constructor(
    message = 'Validation failed',
    errors: Record<string, string[]> = {},
  ) {
    super(message, 400, 'validation_error')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class RateLimitError extends SocifyrError {
  readonly retryAfter: number

  constructor(retryAfter = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, 429, 'rate_limit')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class UsageLimitError extends SocifyrError {
  constructor(message = 'Usage limit exceeded. Upgrade your plan.') {
    super(message, 402, 'usage_limit')
    this.name = 'UsageLimitError'
  }
}
