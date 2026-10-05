import { describe, expect, it } from 'vitest';

import {
  deviceTokenOwnerOutput,
  registerDeviceTokenInput,
  removeDeviceTokenInput,
} from './device-token.js';

describe('device token schemas', () => {
  it('accepts Expo push tokens on both platforms', () => {
    for (const token of ['ExponentPushToken[abcDEF123_-xyz]', 'ExpoPushToken[q1w2e3r4]']) {
      expect(registerDeviceTokenInput.safeParse({ token, platform: 'IOS' }).success).toBe(true);
    }
    expect(
      registerDeviceTokenInput.safeParse({ token: 'ExponentPushToken[a1]', platform: 'ANDROID' }).success,
    ).toBe(true);
  });

  it('rejects malformed tokens and unknown platforms', () => {
    expect(registerDeviceTokenInput.safeParse({ token: 'fcm:abc', platform: 'IOS' }).success).toBe(false);
    expect(registerDeviceTokenInput.safeParse({ token: 'ExponentPushToken[]', platform: 'IOS' }).success).toBe(false);
    expect(
      registerDeviceTokenInput.safeParse({ token: 'ExponentPushToken[a1]', platform: 'WEB' }).success,
    ).toBe(false);
    expect(removeDeviceTokenInput.safeParse({}).success).toBe(false);
  });

  it('never echoes the token in output', () => {
    expect(Object.keys(deviceTokenOwnerOutput.shape)).not.toContain('token');
    expect(Object.keys(deviceTokenOwnerOutput.shape)).not.toContain('userAccountId');
  });
});
