const {
  authCookie,
  isAuthorized,
  jsonResponse,
  publicConfig,
  readConfig,
  unauthorizedResponse,
  writeConfig
} = require("./_shared/config.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});

  try {
    const existing = await readConfig();
    if (!isAuthorized(event, existing)) return unauthorizedResponse();

    if (event.httpMethod === "GET") {
      return jsonResponse(200, publicConfig(existing));
    }

    if (event.httpMethod === "PUT") {
      const config = JSON.parse(event.body || "{}");
      const updated = await writeConfig(config);
      return jsonResponse(200, publicConfig(updated), {
        "set-cookie": authCookie(updated.accessPassword)
      });
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (error) {
    return jsonResponse(500, { error: error.message });
  }
};
