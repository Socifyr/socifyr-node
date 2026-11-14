import { enc, type HttpClient } from '../http'
import type {
  ConnectionRefreshResult,
  ReconnectLink,
  Workspace,
  Connection,
  WorkspaceMember,
  Invitation,
  ApiKey,
  ApiKeyWithSecret,
  UpdateApiKeyParams,
  InvitableRole,
  Platform,
  UsageSummary,
} from '../types'

/** Path segment for the workspace the API key belongs to. */
const CURRENT = 'current'

export class WorkspacesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Current usage vs plan limits for the active workspace: posts this month,
   * connected accounts, and storage. `limit`/`remaining` are null for
   * unlimited dimensions (`unlimited: true`).
   *
   * @example
   * ```ts
   * const usage = await socifyr.workspaces.usage()
   * console.log(`${usage.accounts.used}/${usage.accounts.limit ?? '∞'} accounts`)
   * ```
   */
  async usage(): Promise<UsageSummary> {
    return this.http.get('/usage')
  }

  // ── Workspace CRUD ────────────────────────────────────────────────────

  /**
   * Create a new workspace.
   *
   * @example
   * ```ts
   * const ws = await socifyr.workspaces.create({ name: 'Marketing' })
   * ```
   */
  async create(params: { name: string }): Promise<Workspace> {
    return this.http.post('/workspaces', params)
  }

  /**
   * List all workspaces you belong to.
   */
  async list(): Promise<Workspace[]> {
    return this.http.get('/workspaces')
  }

  /**
   * Get a workspace. Omit `id` for the workspace the API key belongs to.
   */
  async get(id?: string): Promise<Workspace> {
    return this.http.get(`/workspaces/${id ? enc(id) : CURRENT}`)
  }

  /**
   * Update workspace name.
   */
  async update(id: string, params: { name: string }): Promise<Workspace> {
    return this.http.patch(`/workspaces/${enc(id)}`, params)
  }

  /**
   * Delete a workspace (cannot be your last one).
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/workspaces/${enc(id)}`)
  }

  // ── Platform Connections ──────────────────────────────────────────────

  /**
   * List the connected social accounts in the API key's workspace.
   * Returns connection slugs needed for posting.
   *
   * @example
   * ```ts
   * const connections = await socifyr.workspaces.listConnections()
   * console.log(connections.map(c => c.slug))
   * // ['instagram-mybrand', 'twitter-mybrand', 'linkedin-company']
   * ```
   */
  async listConnections(): Promise<Connection[]> {
    return this.http.get(`/workspaces/current/connections`)
  }

  /**
   * Disconnect a platform from the workspace.
   */
  async disconnectPlatform(platform: Platform): Promise<void> {
    return this.http.delete(`/workspaces/current/platforms/${enc(platform)}`)
  }

  /**
   * Revoke platform tokens (disconnect + revoke OAuth).
   */
  async revokePlatform(platform: Platform): Promise<void> {
    return this.http.delete(`/workspaces/current/platforms/${enc(platform)}/revoke`)
  }

  /**
   * Switch the active page/account for a platform connection
   * (e.g. pick which Facebook page posts go to).
   *
   * @example
   * ```ts
   * await socifyr.workspaces.updatePlatformTarget('facebook', {
   *   targetId: '17841400012345678',
   *   targetName: 'My Brand Page',
   * })
   * ```
   */
  async updatePlatformTarget(platform: Platform, params: { targetId: string; targetName: string }): Promise<void> {
    return this.http.patch(`/workspaces/current/platforms/${enc(platform)}/target`, params)
  }

  /**
   * Disconnect a single connection by ID (platform-wide disconnect leaves
   * other connections for the same platform intact).
   */
  async deleteConnection(connectionId: string): Promise<void> {
    return this.http.delete(`/workspaces/current/connections/${enc(connectionId)}`)
  }

  /**
   * Disconnect a single connection AND revoke its OAuth tokens server-side.
   */
  async revokeConnection(connectionId: string): Promise<void> {
    return this.http.delete(`/workspaces/current/connections/${enc(connectionId)}/revoke`)
  }

  /**
   * Fork a page-based connection (Facebook/Instagram) into a new connection
   * for another page under the same OAuth grant.
   *
   * Returns the raw connection document — call `listConnections()` for the
   * mapped shape (slug, platform, targetName).
   */
  async forkConnection(connectionId: string, params: { targetId: string; targetName: string; targetImageUrl?: string }): Promise<Record<string, unknown>> {
    return this.http.post(`/workspaces/current/connections/${enc(connectionId)}/fork`, params)
  }

  /**
   * Switch the page/account a single connection posts to.
   */
  async updateConnectionTarget(connectionId: string, params: { targetId: string; targetName: string }): Promise<void> {
    return this.http.patch(`/workspaces/current/connections/${enc(connectionId)}/target`, params)
  }

  /**
   * Refresh the OAuth tokens for a connection (slug or id). Only works when the
   * connection has a refresh token (`canRefresh`); otherwise use
   * `getReconnectLink()`.
   */
  async refreshConnection(connection: string): Promise<ConnectionRefreshResult> {
    return this.http.post(`/workspaces/current/connections/${enc(connection)}/refresh`)
  }

  /**
   * Get a short-lived, single-use link the account owner opens to re-authorize a
   * connection whose token expired and cannot refresh. The connection (and its
   * slug) is updated in place — no dashboard visit needed.
   */
  async getReconnectLink(connection: string): Promise<ReconnectLink> {
    return this.http.post(`/oauth/connections/${enc(connection)}/reconnect-link`)
  }

  // ── Members ───────────────────────────────────────────────────────────

  /**
   * List workspace members.
   */
  async listMembers(): Promise<WorkspaceMember[]> {
    return this.http.get(`/workspaces/current/members`)
  }

  /**
   * Update a member's role.
   *
   * @example
   * ```ts
   * await socifyr.workspaces.updateMemberRole('user_456', 'EDITOR')
   * ```
   */
  async updateMemberRole(userId: string, roleKey: InvitableRole): Promise<void> {
    return this.http.patch(`/workspaces/current/members/${enc(userId)}/role`, { roleKey })
  }

  /**
   * Remove a member from the workspace.
   */
  async removeMember(userId: string): Promise<void> {
    return this.http.delete(`/workspaces/current/members/${enc(userId)}`)
  }

  // ── Invitations ───────────────────────────────────────────────────────

  /**
   * Invite a user to the workspace by email.
   *
   * @example
   * ```ts
   * await socifyr.workspaces.invite({
   *   email: 'alice@example.com',
   *   roleKey: 'EDITOR',
   * })
   * ```
   */
  async invite(params: { email: string; roleKey: InvitableRole }): Promise<Invitation> {
    return this.http.post(`/workspaces/current/invitations`, params)
  }

  /**
   * List pending invitations for a workspace.
   */
  async listInvitations(): Promise<Invitation[]> {
    return this.http.get(`/workspaces/current/invitations`)
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    return this.http.delete(`/workspaces/current/invitations/${enc(invitationId)}`)
  }

  // ── API Keys ──────────────────────────────────────────────────────────

  /**
   * List API keys for the workspace.
   */
  async listApiKeys(): Promise<ApiKey[]> {
    return this.http.get(`/workspaces/current/api-keys`)
  }

  /**
   * Create a new API key. The full key is only returned once.
   *
   * @example
   * ```ts
   * const key = await socifyr.workspaces.createApiKey({
   *   label: 'CI/CD Pipeline',
   * })
   * console.log('Save this key:', key.key)
   * ```
   */
  async createApiKey(params: { label: string }): Promise<ApiKeyWithSecret> {
    return this.http.post(`/workspaces/current/api-keys`, params)
  }

  /**
   * Update an API key's label and/or agent guardrails (#20):
   * dailyPostLimit, monthlyXSpendCentsCap (US cents), requireApproval.
   * Pass `null` for a cap to remove it; omitted fields stay unchanged.
   */
  async updateApiKey(keyId: string, params: UpdateApiKeyParams): Promise<{ success: boolean; id: string }> {
    return this.http.put(`/workspaces/current/api-keys/${enc(keyId)}`, params)
  }

  /**
   * Delete an API key.
   */
  async deleteApiKey(keyId: string): Promise<void> {
    return this.http.delete(`/workspaces/current/api-keys/${enc(keyId)}`)
  }
}
