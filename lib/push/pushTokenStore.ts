import * as SecureStore from "expo-secure-store";

const SECURE_STORE_KEY = "push_token_registered";

let lastRegisteredToken: string | null = null;

export function rememberRegisteredPushToken(token: string): void {
  lastRegisteredToken = token;
  void SecureStore.setItemAsync(SECURE_STORE_KEY, token);
}

export function getRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}

/** Falls back to SecureStore when in-memory value is null (e.g. after app restart). */
export async function getRegisteredPushTokenAsync(): Promise<string | null> {
  if (lastRegisteredToken) return lastRegisteredToken;
  return SecureStore.getItemAsync(SECURE_STORE_KEY);
}

export function clearRegisteredPushToken(): void {
  lastRegisteredToken = null;
  void SecureStore.deleteItemAsync(SECURE_STORE_KEY);
}
