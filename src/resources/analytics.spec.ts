jest.mock('../http', () => ({
  enc: (s: string) => s,
  HttpClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}))

import { AnalyticsResource } from './analytics'
import type { HttpClient } from '../http'

describe('AnalyticsResource', () => {
  let resource: AnalyticsResource
  let mockHttp: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    const { HttpClient } = jest.requireMock('../http')
    mockHttp = new HttpClient() as jest.Mocked<InstanceType<typeof HttpClient>>
    resource = new AnalyticsResource(mockHttp)
  })

  it('followers gets /analytics/followers with the query', async () => {
    const growth = { from: 'a', to: 'b', totals: { followers: 10, change: 2 }, accounts: [] }
    mockHttp.get = jest.fn().mockResolvedValue(growth)

    await expect(resource.followers({ period: 'last_3months', connection: 'x-brand' })).resolves.toBe(growth)
    expect(mockHttp.get).toHaveBeenCalledWith('/analytics/followers', {
      period: 'last_3months',
      connection: 'x-brand',
    })
  })

  it('followers defaults to an empty query', async () => {
    mockHttp.get = jest.fn().mockResolvedValue({})
    await resource.followers()
    expect(mockHttp.get).toHaveBeenCalledWith('/analytics/followers', {})
  })

  it('accounts gets /analytics/accounts with the query', async () => {
    mockHttp.get = jest.fn().mockResolvedValue({ accounts: [] })
    await resource.accounts({ platform: 'x', from: '2026-10-01', to: '2026-10-31' })
    expect(mockHttp.get).toHaveBeenCalledWith('/analytics/accounts', {
      platform: 'x',
      from: '2026-10-01',
      to: '2026-10-31',
    })
  })

  it('sync posts to /analytics/sync and returns the follower snapshot result', async () => {
    const result = { success: true, followers: { captured: 3, failed: 1 } }
    mockHttp.post = jest.fn().mockResolvedValue(result)
    await expect(resource.sync()).resolves.toBe(result)
    expect(mockHttp.post).toHaveBeenCalledWith('/analytics/sync')
  })
})
