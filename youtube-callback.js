const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        body: "YouTube OAuth environment variables are missing."
      };
    }

    const params = new URLSearchParams(event.rawQuery || "");
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      return {
        statusCode: 400,
        body: `YouTube authorization failed: ${error}`
      };
    }

    if (!code || !state) {
      return {
        statusCode: 400,
        body: "Missing OAuth code or state."
      };
    }

    // Decode and verify OAuth state
    let decodedState;

    try {
      decodedState = Buffer.from(state, "base64url").toString("utf8");
    } catch {
      return {
        statusCode: 400,
        body: "Invalid OAuth state."
      };
    }

    const parts = decodedState.split(".");

    if (parts.length !== 3) {
      return {
        statusCode: 400,
        body: "Invalid OAuth state format."
      };
    }

    const timestamp = parts[0];
    const random = parts[1];
    const receivedSignature = parts[2];

    const stateData = `${timestamp}.${random}`;

    const expectedSignature = crypto
      .createHmac("sha256", clientSecret)
      .update(stateData)
      .digest("hex");

    const validSignature =
      receivedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

    if (!validSignature) {
      return {
        statusCode: 400,
        body: "Invalid OAuth state signature."
      };
    }

    // State expires after 10 minutes
    const stateAge = Date.now() - Number(timestamp);

    if (!Number.isFinite(stateAge) || stateAge < 0 || stateAge > 10 * 60 * 1000) {
      return {
        statusCode: 400,
        body: "OAuth session expired. Please try again."
      };
    }

    const redirectUri =
      "https://onepost-ai.netlify.app/.netlify/functions/youtube-callback";

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Google token exchange failed",
          details: tokenData
        })
      };
    }

    if (!tokenData.refresh_token) {
      return {
        statusCode: 400,
        body:
          "No refresh token was returned by Google. Please try connecting YouTube again."
      };
    }

    // Store the refresh token securely in Netlify Blobs
    const { getStore } = await import("@netlify/blobs");

    const store = getStore("youtube-auth");

    await store.set(
      "refresh-token",
      JSON.stringify({
        refresh_token: tokenData.refresh_token,
        created_at: new Date().toISOString()
      })
    );

    return {
      statusCode: 302,
      headers: {
        Location: "https://onepost-ai.netlify.app/?youtube=connected",
        "Cache-Control": "no-store"
      },
      body: ""
    };
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);

    return {
      statusCode: 500,
      body: "YouTube connection failed. Please try again."
    };
  }
};
