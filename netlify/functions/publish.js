exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed"
      })
    };
  }

  try {
    const { platforms = [] } = JSON.parse(event.body || "{}");

    if (!platforms.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "No platform selected"
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ok: true,
        mode: "demo",
        message:
          "Publishing workflow ready. Real platform APIs will be connected later.",
        platforms
      })
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
