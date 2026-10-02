import * as crypto from 'crypto';
import { verifyLineSignature } from './line.signature';

describe('verifyLineSignature', () => {
  const secret = 'channel_secret_for_tests';
  const body = Buffer.from('{"destination":"Uxxx","events":[]}');

  function sign(payload: Buffer, channelSecret: string): string {
    return crypto
      .createHmac('SHA256', channelSecret)
      .update(payload)
      .digest('base64');
  }

  it('accepts a valid signature', () => {
    expect(verifyLineSignature(body, secret, sign(body, secret))).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(verifyLineSignature(body, secret, 'not-a-valid-signature')).toBe(
      false,
    );
  });

  it('rejects a missing signature', () => {
    expect(verifyLineSignature(body, secret, '')).toBe(false);
  });

  it('rejects when channel secret is empty (fail closed)', () => {
    expect(verifyLineSignature(body, '', sign(body, secret))).toBe(false);
  });
});
