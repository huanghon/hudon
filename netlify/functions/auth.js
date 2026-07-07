const { authCookie, jsonResponse, readConfig } = require("./_shared/config.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, {});
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    const { password } = JSON.parse(event.body || "{}");
    const config = await readConfig();
    if (String(password || "") !== config.accessPassword) {
      return jsonResponse(401, { error: "Wrong password" });
    }

    return jsonResponse(200, { ok: true }, {
      "set-cookie": authCookie(config.accessPassword)
    });
  } catch (error) {
    return jsonResponse(500, { error: error.message });
  }
};
