import { randomInt } from 'node:crypto';
import { TRACKING_CODE_ALPHABET, TRACKING_CODE_LENGTH } from '@tindak/shared';

export function generateTrackingCode() {
  let code = '';
  for (let index = 0; index < TRACKING_CODE_LENGTH; index += 1) {
    code += TRACKING_CODE_ALPHABET[randomInt(TRACKING_CODE_ALPHABET.length)];
  }
  return code;
}
