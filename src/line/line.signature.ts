import { validateSignature } from '@line/bot-sdk';

/**
 * Verify LINE webhook `x-line-signature` (HMAC-SHA256 base64).
 * Fail closed: empty secret or empty signature → false.
 */
export function verifyLineSignature(
  body: string | Buffer,
  channelSecret: string,
  signature: string,
): boolean {
  if (!channelSecret || !signature) {
    return false;
  }
  return validateSignature(body, channelSecret, signature);
}
