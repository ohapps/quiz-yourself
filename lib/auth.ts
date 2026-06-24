import * as AuthSession from 'expo-auth-session';
import * as SQLite from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_CLIENT_ID = 'uX0QJJ12jkOfr5s0FrWwa8tPgGpfxUTB';
const AUTH0_DOMAIN = 'dev--hkrho7z.us.auth0.com';

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'quizyourself',
  path: 'auth/callback',
});

const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
  userInfoEndpoint: `https://${AUTH0_DOMAIN}/userinfo`,
};

const DATABASE_NAME = 'quiz_yourself.db';

export interface AuthState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  isLoggedIn: boolean;
}

async function getDb() {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function getStoredAuth(): Promise<AuthState> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const token = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_refresh_token'"
  );
  const userId = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_user_id'"
  );
  const email = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_email'"
  );

  if (token && userId) {
    return { accessToken: null, userId: userId.value, email: email?.value || null, isLoggedIn: true };
  }
  return { accessToken: null, userId: null, email: null, isLoggedIn: false };
}

export async function login(): Promise<AuthState> {
  const request = new AuthSession.AuthRequest({
    clientId: AUTH0_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
    },
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Login cancelled or failed');
  }

  // Exchange code for tokens
  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: AUTH0_CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier! },
    },
    discovery
  );

  // Get user info
  const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
  });
  const userInfo = await userInfoResponse.json();
  const userId = userInfo.sub;

  // Persist
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('auth0_refresh_token', ?)",
    [tokenResult.refreshToken || '']
  );
  await db.runAsync(
    "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('auth0_user_id', ?)",
    [userId]
  );
  await db.runAsync(
    "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('auth0_email', ?)",
    [userInfo.email || '']
  );

  return { accessToken: tokenResult.accessToken, userId, email: userInfo.email || null, isLoggedIn: true };
}

export async function refreshAccessToken(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_refresh_token'"
  );

  if (!row?.value) return null;

  try {
    const tokenResult = await AuthSession.refreshAsync(
      { clientId: AUTH0_CLIENT_ID, refreshToken: row.value },
      discovery
    );

    if (tokenResult.refreshToken && tokenResult.refreshToken !== row.value) {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('auth0_refresh_token', ?)",
        [tokenResult.refreshToken]
      );
    }

    return tokenResult.accessToken;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_refresh_token'"
  );

  // Revoke refresh token on Auth0 server
  if (row?.value) {
    await fetch(discovery.revocationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${AUTH0_CLIENT_ID}&token=${row.value}&token_type_hint=refresh_token`,
    }).catch(() => {}); // Best-effort — clear local state regardless
  }

  await db.runAsync("DELETE FROM app_metadata WHERE key IN ('auth0_refresh_token', 'auth0_user_id', 'auth0_email')");
}

export async function getAuthUserId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'auth0_user_id'"
  );
  return row?.value || null;
}
