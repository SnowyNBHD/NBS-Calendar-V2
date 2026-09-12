// Exchanges a stored Google refresh token for a short-lived access token.
// Needed because Supabase Auth's own token refresh is for keeping the login
// session alive — it doesn't hand the app a way to mint Calendar API access
// tokens from a background job. We use the same OAuth client credentials
// the refresh token was originally issued under.
export async function getGoogleAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}
