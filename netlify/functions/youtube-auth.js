const crypto = require("crypto");

exports.handler = async () => {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        body: "YouTube OAuth environment variables are missing."
      };
    }

    const redirectUri =
      "https://onepost-ai.netlify.app/.netlify/functions/youtube-callback";

    // Create a short-lived signed state for OAuth security
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString("hex");
    const stateData = `${timestamp}.${random}`;

    const signature = crypto
      .createHmac("sha256", clientSecret)
      .update(stateData)
      .digest("hex");

    const state = Buffer.from(
      `${stateData}.${signature}`
    ).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/youtube.upload",
      state: state
    });

    const authorizationUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return {
      statusCode: 302,
      headers: {
        Location: authorizationUrl,
        "Cache-Control": "no-store"
      },
      body: ""
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
