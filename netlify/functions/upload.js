const {
  isAuthorized,
  jsonResponse,
  readConfig,
  unauthorizedResponse,
  uploadAsset
} = require("./_shared/config.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const config = await readConfig();
    if (!isAuthorized(event, config)) return unauthorizedResponse();

    const payload = JSON.parse(event.body || "{}");
    const url = await uploadAsset(payload);
    return jsonResponse(200, { url });
  } catch (error) {
    return jsonResponse(500, { error: error.message });
  }
};
