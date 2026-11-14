jest.mock('./http', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    postForm: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}))

import { Socifyr } from './client'

describe('Socifyr', () => {
  it('throws if apiKey is missing', () => {
    expect(() => new Socifyr({ apiKey: '' })).toThrow(
      'apiKey is required',
    )
  })

  it('works with only an API key (the key selects the workspace)', () => {
    const client = new Socifyr({ apiKey: 'sk_test' })
    expect(client.workspaces).toBeDefined()
  })

  it('creates all resources', () => {
    const client = new Socifyr({ apiKey: 'sk_test' })
    expect(client.uploads).toBeDefined()
    expect(client.media).toBeDefined()
    expect(client.ai).toBeDefined()
    expect(client.analytics).toBeDefined()
    expect(client.engagement).toBeDefined()
    expect(client.webhooks).toBeDefined()
    expect(client.workspaces).toBeDefined()
  })

  it('accepts optional apiUrl override', () => {
    const client = new Socifyr({
      apiKey: 'sk_test',
      apiUrl: 'https://custom.api.com/api',
    })
    expect(client.uploads).toBeDefined()
  })

  it('accepts optional timeout and maxRetries', () => {
    const client = new Socifyr({
      apiKey: 'sk_test',
      timeout: 10_000,
      maxRetries: 5,
    })
    expect(client.uploads).toBeDefined()
  })
})