import { useState, useCallback } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "docscanner:google_access_token";
const TOKEN_EXPIRY_KEY = "docscanner:google_token_expiry";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

/**
 * OAuth client IDs come from your own Google Cloud project — see
 * README "Google Drive backup setup" for how to create them. We only ever
 * request the `drive.file` scope, meaning this app can only see/manage the
 * files it creates itself, never the user's whole Drive.
 */
function getClientId(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    googleOAuth?: { web?: string; ios?: string; android?: string };
  };
  const ids = extra.googleOAuth ?? {};
  if (Platform.OS === "ios") return ids.ios ?? ids.web;
  if (Platform.OS === "android") return ids.android ?? ids.web;
  return ids.web;
}

export async function getStoredToken(): Promise<string | null> {
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  if (!expiry || Date.now() > Number(expiry)) return null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(accessToken: string, expiresInSeconds: number) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(
    TOKEN_EXPIRY_KEY,
    String(Date.now() + expiresInSeconds * 1000 - 60_000)
  );
}

export async function clearStoredToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}

export function useGoogleDriveAuth() {
  const [loading, setLoading] = useState(false);
  const clientId = getClientId();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "scanvexa" });

  const signIn = useCallback(async (): Promise<string | null> => {
    if (!clientId) {
      throw new Error(
        "Google OAuth client ID কনফিগার করা হয়নি — app.json-এর extra.googleOAuth দেখুন (README-তে ধাপে ধাপে লেখা আছে)।"
      );
    }

    const existing = await getStoredToken();
    if (existing) return existing;

    setLoading(true);
    try {
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: [DRIVE_SCOPE],
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.authentication?.accessToken) {
        const { accessToken, expiresIn } = result.authentication;
        await storeToken(accessToken, expiresIn ?? 3600);
        return accessToken;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, redirectUri]);

  const signOut = useCallback(async () => {
    await clearStoredToken();
  }, []);

  return { signIn, signOut, loading, isConfigured: Boolean(clientId) };
}
