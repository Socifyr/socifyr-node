import { createHmac } from 'crypto'

import { verifyWebhookSignature, parseWebhookEvent } from './webhooks'

const SECRET = 'whsec_test'

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

const BODY = JSON.stringify({
  event: 'upload.completed',
  payload: { uploadId: 'upload_1' },
  timestamp: '2026-09-12T10:00:00.000Z',
  deliveryId: 'delivery_1',
})

describe('verifyWebhookSignature', () => {
  it('accepts a genuine sha256=<hex> signature over the raw body', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it('accepts a Buffer payload', () => {
    expect(verifyWebhookSignature(Buffer.from(BODY), sign(BODY), SECRET)).toBe(true)
  })

  it('rejects a signature computed with the wrong secret', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, 'whsec_other'), SECRET)).toBe(false)
  })

  it('rejects a signature computed over a different body', () => {
    expect(verifyWebhookSignature('{"event":"upload.failed"}', sign(BODY), SECRET)).toBe(false)
  })

  it('rejects signatures without the sha256= prefix', () => {
    const hex = sign(BODY).slice('sha256='.length)
    expect(verifyWebhookSignature(BODY, hex, SECRET)).toBe(false)
  })

  it('rejects the legacy t=...,v1=... format the API never sends', () => {
    expect(verifyWebhookSignature(BODY, 't=123,v1=abc', SECRET)).toBe(false)
  })

  it('rejects missing signature or secret', () => {
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false)
    expect(verifyWebhookSignature(BODY, sign(BODY), '')).toBe(false)
  })

  it('rejects malformed hex without throwing', () => {
    expect(verifyWebhookSignature(BODY, 'sha256=not-hex', SECRET)).toBe(false)
  })
})

describe('parseWebhookEvent', () => {
  it('parses the delivery body shape', () => {
    const event = parseWebhookEvent(BODY)
    expect(event.event).toBe('upload.completed')
    expect(event.payload).toEqual({ uploadId: 'upload_1' })
    expect(event.deliveryId).toBe('delivery_1')
    expect(event.timestamp).toBe('2026-09-12T10:00:00.000Z')
  })

  it('accepts a Buffer payload', () => {
    const event = parseWebhookEvent(Buffer.from(BODY))
    expect(event.event).toBe('upload.completed')
  })
})
