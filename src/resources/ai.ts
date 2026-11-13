import type { HttpClient } from '../http'
import type {
  AiStatus,
  GenerateContentParams,
  GeneratedContent,
  SuggestHashtagsParams,
  SuggestedHashtags,
} from '../types'

export class AiResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Check if AI features are available for your workspace.
   *
   * @example
   * ```ts
   * const { available } = await socifyr.ai.status()
   * ```
   */
  async status(): Promise<AiStatus> {
    return this.http.get('/ai/status')
  }

  /**
   * Generate platform-optimized content using AI.
   *
   * @example
   * ```ts
   * const content = await socifyr.ai.generateContent({
   *   uploadType: 'video',
   *   platforms: ['instagram', 'tiktok', 'linkedin'],
   *   title: 'Product launch video',
   *   tone: 'professional',
   *   brandVoice: 'We speak with authority but stay approachable',
   * })
   *
   * for (const [platform, caption] of Object.entries(content.content)) {
   *   console.log(`${platform}: ${caption}`)
   * }
   * ```
   */
  async generateContent(params: GenerateContentParams): Promise<GeneratedContent> {
    return this.http.post('/ai/generate-content', params)
  }

  /**
   * Get AI-suggested hashtags for your content.
   *
   * @example
   * ```ts
   * const hashtags = await socifyr.ai.suggestHashtags({
   *   text: 'Launching our new social media SDK',
   *   platforms: ['instagram', 'x'],
   *   count: 15,
   * })
   * ```
   */
  async suggestHashtags(params: SuggestHashtagsParams): Promise<SuggestedHashtags[]> {
    return this.http.post('/ai/suggest-hashtags', params)
  }
}
