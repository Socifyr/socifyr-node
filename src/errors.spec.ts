import {
  SocifyrError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  UsageLimitError,
} from './errors'

describe('SocifyrError', () => {
  it('has correct properties', () => {
    const err = new SocifyrError('Oops', 500, 'server_error', 'req-123')
    expect(err.message).toBe('Oops')
    expect(err.status).toBe(500)
    expect(err.code).toBe('server_error')
    expect(err.requestId).toBe('req-123')
    expect(err.name).toBe('SocifyrError')
    expect(err instanceof Error).toBe(true)
  })

  it('works without requestId', () => {
    const err = new SocifyrError('Oops', 500, 'server_error')
    expect(err.requestId).toBeUndefined()
  })
})

describe('AuthenticationError', () => {
  it('defaults message and sets correct properties', () => {
    const err = new AuthenticationError()
    expect(err.message).toBe('Invalid or missing API key')
    expect(err.status).toBe(401)
    expect(err.code).toBe('authentication_error')
    expect(err.name).toBe('AuthenticationError')
    expect(err instanceof SocifyrError).toBe(true)
  })

  it('accepts custom message', () => {
    const err = new AuthenticationError('Token expired')
    expect(err.message).toBe('Token expired')
  })
})

describe('PermissionError', () => {
  it('defaults message and sets correct properties', () => {
    const err = new PermissionError()
    expect(err.message).toBe('Insufficient permissions')
    expect(err.status).toBe(403)
    expect(err.code).toBe('permission_error')
    expect(err instanceof SocifyrError).toBe(true)
  })
})

describe('NotFoundError', () => {
  it('defaults message and sets correct properties', () => {
    const err = new NotFoundError()
    expect(err.message).toBe('Resource not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('not_found')
    expect(err instanceof SocifyrError).toBe(true)
  })
})

describe('ValidationError', () => {
  it('defaults message and has no errors by default', () => {
    const err = new ValidationError()
    expect(err.message).toBe('Validation failed')
    expect(err.status).toBe(400)
    expect(err.code).toBe('validation_error')
    expect(err.errors).toEqual({})
    expect(err instanceof SocifyrError).toBe(true)
  })

  it('carries field-level errors', () => {
    const err = new ValidationError('Invalid input', {
      email: ['Invalid format'],
      password: ['Too short', 'Missing number'],
    })
    expect(err.errors).toEqual({
      email: ['Invalid format'],
      password: ['Too short', 'Missing number'],
    })
  })
})

describe('RateLimitError', () => {
  it('defaults to 60s', () => {
    const err = new RateLimitError()
    expect(err.message).toBe('Rate limit exceeded. Retry after 60s')
    expect(err.status).toBe(429)
    expect(err.code).toBe('rate_limit')
    expect(err.retryAfter).toBe(60)
    expect(err instanceof SocifyrError).toBe(true)
  })

  it('uses custom retry-after value', () => {
    const err = new RateLimitError(120)
    expect(err.message).toBe('Rate limit exceeded. Retry after 120s')
    expect(err.retryAfter).toBe(120)
  })
})

describe('UsageLimitError', () => {
  it('defaults message and sets correct properties', () => {
    const err = new UsageLimitError()
    expect(err.message).toBe('Usage limit exceeded. Upgrade your plan.')
    expect(err.status).toBe(402)
    expect(err.code).toBe('usage_limit')
    expect(err instanceof SocifyrError).toBe(true)
  })
})