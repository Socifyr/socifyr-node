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

/**
 * Workspace-scoped methods take an optional leading workspace id for backward
 * compatibility. An API key already belongs to exactly one workspace, so new
 * code omits it: `refreshConnection('x-me')` ≡ `refreshConnection(id, 'x-me')`.
 * Returns `[workspacePathSegment, ...remainingArgs]`.
 */
function scoped<T extends unknown[]>(args: unknown[], arity: number): [string, ...T] {
  if (args.length > arity) {
    const [workspaceId, ...rest] = args
    // A legacy caller may pass an unset id (undefined / ''): use the key's workspace.
    return [workspaceId ? enc(String(workspaceId)) : CURRENT, ...(rest as T)]
  }
  return [CURRENT, ...(args as T)]
}

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
  async listConnections(): Promise<Connection[]>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async listConnections(workspaceId: string): Promise<Connection[]>
  async listConnections(...args: unknown[]): Promise<Connection[]> {
    const [ws] = scoped<[]>(args, 0)
    return this.http.get(`/workspaces/${ws}/connections`)
  }

  /**
   * Disconnect a platform from the workspace.
   */
  async disconnectPlatform(platform: Platform): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async disconnectPlatform(workspaceId: string, platform: Platform): Promise<void>
  async disconnectPlatform(...args: unknown[]): Promise<void> {
    const [ws, platform] = scoped<[Platform]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/platforms/${enc(platform)}`)
  }

  /**
   * Revoke platform tokens (disconnect + revoke OAuth).
   */
  async revokePlatform(platform: Platform): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async revokePlatform(workspaceId: string, platform: Platform): Promise<void>
  async revokePlatform(...args: unknown[]): Promise<void> {
    const [ws, platform] = scoped<[Platform]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/platforms/${enc(platform)}/revoke`)
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
  async updatePlatformTarget(platform: Platform, params: { targetId: string; targetName: string }): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async updatePlatformTarget(workspaceId: string, platform: Platform, params: { targetId: string; targetName: string }): Promise<void>
  async updatePlatformTarget(...args: unknown[]): Promise<void> {
    const [ws, platform, params] = scoped<[Platform, { targetId: string; targetName: string }]>(args, 2)
    return this.http.patch(`/workspaces/${ws}/platforms/${enc(platform)}/target`, params)
  }

  /**
   * Disconnect a single connection by ID (platform-wide disconnect leaves
   * other connections for the same platform intact).
   */
  async deleteConnection(connectionId: string): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async deleteConnection(workspaceId: string, connectionId: string): Promise<void>
  async deleteConnection(...args: unknown[]): Promise<void> {
    const [ws, connectionId] = scoped<[string]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/connections/${enc(connectionId)}`)
  }

  /**
   * Disconnect a single connection AND revoke its OAuth tokens server-side.
   */
  async revokeConnection(connectionId: string): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async revokeConnection(workspaceId: string, connectionId: string): Promise<void>
  async revokeConnection(...args: unknown[]): Promise<void> {
    const [ws, connectionId] = scoped<[string]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/connections/${enc(connectionId)}/revoke`)
  }

  /**
   * Fork a page-based connection (Facebook/Instagram) into a new connection
   * for another page under the same OAuth grant.
   *
   * Returns the raw connection document — call `listConnections()` for the
   * mapped shape (slug, platform, targetName).
   */
  async forkConnection(connectionId: string, params: { targetId: string; targetName: string; targetImageUrl?: string }): Promise<Record<string, unknown>>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async forkConnection(workspaceId: string, connectionId: string, params: { targetId: string; targetName: string; targetImageUrl?: string }): Promise<Record<string, unknown>>
  async forkConnection(...args: unknown[]): Promise<Record<string, unknown>> {
    const [ws, connectionId, params] = scoped<[string, { targetId: string; targetName: string; targetImageUrl?: string }]>(args, 2)
    return this.http.post(`/workspaces/${ws}/connections/${enc(connectionId)}/fork`, params)
  }

  /**
   * Switch the page/account a single connection posts to.
   */
  async updateConnectionTarget(connectionId: string, params: { targetId: string; targetName: string }): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async updateConnectionTarget(workspaceId: string, connectionId: string, params: { targetId: string; targetName: string }): Promise<void>
  async updateConnectionTarget(...args: unknown[]): Promise<void> {
    const [ws, connectionId, params] = scoped<[string, { targetId: string; targetName: string }]>(args, 2)
    return this.http.patch(`/workspaces/${ws}/connections/${enc(connectionId)}/target`, params)
  }

  /**
   * Refresh the OAuth tokens for a connection (slug or id). Only works when the
   * connection has a refresh token (`canRefresh`); otherwise use
   * `getReconnectLink()`.
   */
  async refreshConnection(connection: string): Promise<ConnectionRefreshResult>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async refreshConnection(workspaceId: string, connection: string): Promise<ConnectionRefreshResult>
  async refreshConnection(...args: unknown[]): Promise<ConnectionRefreshResult> {
    const [ws, connection] = scoped<[string]>(args, 1)
    return this.http.post(`/workspaces/${ws}/connections/${enc(connection)}/refresh`)
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
  async listMembers(): Promise<WorkspaceMember[]>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]>
  async listMembers(...args: unknown[]): Promise<WorkspaceMember[]> {
    const [ws] = scoped<[]>(args, 0)
    return this.http.get(`/workspaces/${ws}/members`)
  }

  /**
   * Update a member's role.
   *
   * @example
   * ```ts
   * await socifyr.workspaces.updateMemberRole('user_456', 'EDITOR')
   * ```
   */
  async updateMemberRole(userId: string, roleKey: InvitableRole): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async updateMemberRole(workspaceId: string, userId: string, roleKey: InvitableRole): Promise<void>
  async updateMemberRole(...args: unknown[]): Promise<void> {
    const [ws, userId, roleKey] = scoped<[string, InvitableRole]>(args, 2)
    return this.http.patch(`/workspaces/${ws}/members/${enc(userId)}/role`, { roleKey })
  }

  /**
   * Remove a member from the workspace.
   */
  async removeMember(userId: string): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async removeMember(workspaceId: string, userId: string): Promise<void>
  async removeMember(...args: unknown[]): Promise<void> {
    const [ws, userId] = scoped<[string]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/members/${enc(userId)}`)
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
  async invite(params: { email: string; roleKey: InvitableRole }): Promise<Invitation>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async invite(workspaceId: string, params: { email: string; roleKey: InvitableRole }): Promise<Invitation>
  async invite(...args: unknown[]): Promise<Invitation> {
    const [ws, params] = scoped<[{ email: string; roleKey: InvitableRole }]>(args, 1)
    return this.http.post(`/workspaces/${ws}/invitations`, params)
  }

  /**
   * List pending invitations for a workspace.
   */
  async listInvitations(): Promise<Invitation[]>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async listInvitations(workspaceId: string): Promise<Invitation[]>
  async listInvitations(...args: unknown[]): Promise<Invitation[]> {
    const [ws] = scoped<[]>(args, 0)
    return this.http.get(`/workspaces/${ws}/invitations`)
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(invitationId: string): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async cancelInvitation(workspaceId: string, invitationId: string): Promise<void>
  async cancelInvitation(...args: unknown[]): Promise<void> {
    const [ws, invitationId] = scoped<[string]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/invitations/${enc(invitationId)}`)
  }

  // ── API Keys ──────────────────────────────────────────────────────────

  /**
   * List API keys for the workspace.
   */
  async listApiKeys(): Promise<ApiKey[]>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async listApiKeys(workspaceId: string): Promise<ApiKey[]>
  async listApiKeys(...args: unknown[]): Promise<ApiKey[]> {
    const [ws] = scoped<[]>(args, 0)
    return this.http.get(`/workspaces/${ws}/api-keys`)
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
  async createApiKey(params: { label: string }): Promise<ApiKeyWithSecret>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async createApiKey(workspaceId: string, params: { label: string }): Promise<ApiKeyWithSecret>
  async createApiKey(...args: unknown[]): Promise<ApiKeyWithSecret> {
    const [ws, params] = scoped<[{ label: string }]>(args, 1)
    return this.http.post(`/workspaces/${ws}/api-keys`, params)
  }

  /**
   * Update an API key's label and/or agent guardrails (#20):
   * dailyPostLimit, monthlyXSpendCentsCap (US cents), requireApproval.
   * Pass `null` for a cap to remove it; omitted fields stay unchanged.
   */
  async updateApiKey(keyId: string, params: UpdateApiKeyParams): Promise<{ success: boolean; id: string }>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async updateApiKey(workspaceId: string, keyId: string, params: UpdateApiKeyParams): Promise<{ success: boolean; id: string }>
  async updateApiKey(...args: unknown[]): Promise<{ success: boolean; id: string }> {
    const [ws, keyId, params] = scoped<[string, UpdateApiKeyParams]>(args, 2)
    return this.http.put(`/workspaces/${ws}/api-keys/${enc(keyId)}`, params)
  }

  /**
   * Delete an API key.
   */
  async deleteApiKey(keyId: string): Promise<void>
  /** @deprecated The API key already selects the workspace — drop the leading workspace id. */
  async deleteApiKey(workspaceId: string, keyId: string): Promise<void>
  async deleteApiKey(...args: unknown[]): Promise<void> {
    const [ws, keyId] = scoped<[string]>(args, 1)
    return this.http.delete(`/workspaces/${ws}/api-keys/${enc(keyId)}`)
  }
}
