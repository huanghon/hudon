const {
  defaultConfig,
  isAuthorized,
  jsonResponse,
  publicConfig,
  readConfig,
  unauthorizedResponse,
  writeConfig
} = require("./_shared/config.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const existing = await readConfig();
    if (!isAuthorized(event, existing)) return unauthorizedResponse();

    const updated = await writeConfig({
      ...defaultConfig(),
      accessPassword: existing.accessPassword
    });
    return jsonResponse(200, publicConfig(updated));
  } catch (error) {
    return jsonResponse(500, { error: error.message });
  }
};
