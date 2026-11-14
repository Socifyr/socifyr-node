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

import { WorkspacesResource } from './workspaces'
import type { HttpClient } from '../http'

describe('WorkspacesResource', () => {
  let resource: WorkspacesResource
  let mockHttp: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    const { HttpClient } = jest.requireMock('../http')
    mockHttp = new HttpClient() as jest.Mocked<InstanceType<typeof HttpClient>>
    resource = new WorkspacesResource(mockHttp)
  })

  describe('workspace CRUD', () => {
    it('create posts to /workspaces', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'ws_1', name: 'Marketing' })
      await resource.create({ name: 'Marketing' })
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces', { name: 'Marketing' })
    })

    it('list gets /workspaces', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.list()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces')
    })

    it('update patches /workspaces/:id', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue({})
      await resource.update('ws_1', { name: 'Renamed' })
      expect(mockHttp.patch).toHaveBeenCalledWith('/workspaces/ws_1', { name: 'Renamed' })
    })

    it('delete deletes /workspaces/:id', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.delete('ws_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/ws_1')
    })
  })

  describe('without a workspace id (the API key selects the workspace)', () => {
    it('get() targets /workspaces/current', async () => {
      mockHttp.get = jest.fn().mockResolvedValue({})
      await resource.get()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current')
    })

    it('listConnections() targets the current workspace', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.listConnections()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current/connections')
    })

    it('refreshConnection(slug) targets the current workspace', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({})
      await resource.refreshConnection('x-me')
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces/current/connections/x-me/refresh')
    })

    it('updateApiKey(keyId, params) targets the current workspace', async () => {
      mockHttp.put = jest.fn().mockResolvedValue({})
      await resource.updateApiKey('key_1', { label: 'ci' })
      expect(mockHttp.put).toHaveBeenCalledWith('/workspaces/current/api-keys/key_1', { label: 'ci' })
    })

    it('invite(params) targets the current workspace', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({})
      await resource.invite({ email: 'a@b.co', roleKey: 'EDITOR' })
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces/current/invitations', {
        email: 'a@b.co',
        roleKey: 'EDITOR',
      })
    })

  })

  describe('connections', () => {
    it('listConnections gets /workspaces/current/connections', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.listConnections()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current/connections')
    })

    it('disconnectPlatform deletes /workspaces/current/platforms/:platform', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.disconnectPlatform('facebook')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/platforms/facebook')
    })

    it('revokePlatform deletes the revoke sub-route', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.revokePlatform('instagram')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/platforms/instagram/revoke')
    })

    it('updatePlatformTarget patches the platform target route', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue(undefined)
      await resource.updatePlatformTarget('facebook', {
        targetId: '17841400012345678',
        targetName: 'My Brand Page',
      })
      expect(mockHttp.patch).toHaveBeenCalledWith(
        '/workspaces/current/platforms/facebook/target',
        { targetId: '17841400012345678', targetName: 'My Brand Page' },
      )
    })

    it('deleteConnection deletes /workspaces/current/connections/:connectionId', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.deleteConnection('conn_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/connections/conn_1')
    })

    it('revokeConnection deletes the connection revoke sub-route', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.revokeConnection('conn_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/connections/conn_1/revoke')
    })

    it('forkConnection posts to the fork sub-route with target params', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ _id: 'conn_2' })
      await resource.forkConnection('conn_1', {
        targetId: 'page_2',
        targetName: 'Second Page',
      })
      expect(mockHttp.post).toHaveBeenCalledWith(
        '/workspaces/current/connections/conn_1/fork',
        { targetId: 'page_2', targetName: 'Second Page' },
      )
    })

    it('updateConnectionTarget patches the connection target route', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue(undefined)
      await resource.updateConnectionTarget('conn_1', {
        targetId: 'page_2',
        targetName: 'Second Page',
      })
      expect(mockHttp.patch).toHaveBeenCalledWith(
        '/workspaces/current/connections/conn_1/target',
        { targetId: 'page_2', targetName: 'Second Page' },
      )
    })

    it('refreshConnection posts to the refresh sub-route', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ slug: 'x-me', status: 'active', canRefresh: true })
      const out = await resource.refreshConnection('x-me')
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces/current/connections/x-me/refresh')
      expect(out.status).toBe('active')
    })

    it('getReconnectLink posts to the oauth reconnect-link route', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ url: 'https://api/x', expiresIn: 600, platform: 'x', slug: 'x-me' })
      const link = await resource.getReconnectLink('x-me')
      expect(mockHttp.post).toHaveBeenCalledWith('/oauth/connections/x-me/reconnect-link')
      expect(link.expiresIn).toBe(600)
    })
  })

  describe('members', () => {
    it('listMembers gets /workspaces/current/members', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.listMembers()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current/members')
    })

    it('updateMemberRole patches the role route with roleKey body', async () => {
      mockHttp.patch = jest.fn().mockResolvedValue(undefined)
      await resource.updateMemberRole('user_1', 'EDITOR')
      expect(mockHttp.patch).toHaveBeenCalledWith('/workspaces/current/members/user_1/role', {
        roleKey: 'EDITOR',
      })
    })

    it('removeMember deletes /workspaces/current/members/:userId', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.removeMember('user_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/members/user_1')
    })
  })

  describe('invitations', () => {
    it('invite posts to /workspaces/current/invitations', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'inv_1' })
      await resource.invite({ email: 'alice@example.com', roleKey: 'EDITOR' })
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces/current/invitations', {
        email: 'alice@example.com',
        roleKey: 'EDITOR',
      })
    })

    it('listInvitations gets /workspaces/current/invitations', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.listInvitations()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current/invitations')
    })

    it('cancelInvitation deletes the invitation route', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.cancelInvitation('inv_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/invitations/inv_1')
    })
  })

  describe('API keys', () => {
    it('listApiKeys gets /workspaces/current/api-keys', async () => {
      mockHttp.get = jest.fn().mockResolvedValue([])
      await resource.listApiKeys()
      expect(mockHttp.get).toHaveBeenCalledWith('/workspaces/current/api-keys')
    })

    it('createApiKey posts to /workspaces/current/api-keys', async () => {
      mockHttp.post = jest.fn().mockResolvedValue({ id: 'key_1', key: 'sk_test' })
      await resource.createApiKey({ label: 'CI/CD' })
      expect(mockHttp.post).toHaveBeenCalledWith('/workspaces/current/api-keys', { label: 'CI/CD' })
    })

    it('deleteApiKey deletes the key route', async () => {
      mockHttp.delete = jest.fn().mockResolvedValue(undefined)
      await resource.deleteApiKey('key_1')
      expect(mockHttp.delete).toHaveBeenCalledWith('/workspaces/current/api-keys/key_1')
    })
  })
})
