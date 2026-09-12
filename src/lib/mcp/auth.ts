import {
  OAuthError,
  OAuthErrorCode,
  requireBearerAuth,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";

// Single-user server: no OAuth Authorization Server here, just a static
// shared secret checked on every request. Configured in Claude.ai's custom
// connector with Authentication set to "None" and a manual "Authorization:
// Bearer <secret>" request header — the simplest option the MCP spec
// allows, appropriate for a server with exactly one legitimate caller.
const verifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    if (!process.env.MCP_API_KEY || token !== process.env.MCP_API_KEY) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid token");
    }

    return {
      token,
      clientId: "nbs-calendar-owner",
      scopes: ["mcp"],
      // Static long-lived secret, not a real expiring token — far-future
      // expiry just satisfies the verifier's required field.
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    };
  },
};

export const requireMcpAuth = requireBearerAuth({ verifier });
