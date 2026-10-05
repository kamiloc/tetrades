import { trpc } from '../client.js';

// Register this device's Expo push token for the signed-in account.
export const useRegisterDeviceToken = () => trpc.notification.registerDeviceToken.useMutation();

// Remove this device's token (e.g. on sign-out).
export const useRemoveDeviceToken = () => trpc.notification.removeDeviceToken.useMutation();
