const crypto = require("crypto");

const CONFIG_ID = process.env.SUPABASE_CONFIG_ID || "default";
const CONFIG_TABLE = process.env.SUPABASE_CONFIG_TABLE || "site_configs";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "campaign-assets";
const AUTH_COOKIE = "site_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_ACCESS_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function defaultConfig() {
  return {
    accessPassword: DEFAULT_ACCESS_PASSWORD,
    pageTitle: "Equipment Campaign",
    eyebrow: "Gift code exchange",
    subtitle: "Limited-time equipment claim",
    backgroundColor: "#111820",
    accentColor: "#d71920",
    textColor: "#ffffff",
    claimLoadingColor: "#6fbfff",
    bannerImage: "/uploads/sample-banner.jpg",
    bannerOverlayText: "Join the event to claim rewards",
    bannerOverlayBorderColor: "#41caff",
    characterImage: "/uploads/character-upper.png",
    characterVisible: true,
    sideRibbon: "Benefits channel",
    claimModalTitleTemplate: "Claim {item}",
    claimModalNameLabel: "* Game name",
    claimModalNameValue: "",
    claimModalChannelLabel: "* Channel",
    claimModalChannelValue: "QQ",
    claimModalChannelOptions: "QQ,Wechat",
    claimModalButtonText: "Claim now",
    claimLoadingText: "Claiming...",
    claimSuccessText: "Claimed successfully. Please check in game later.",
    equipmentCount: 6,
    items: [
      {
        name: "Reward 1",
        image: "/uploads/sample-item-1.jpg",
        timeLabel: "29 days 3 hours 9 minutes 4 seconds",
        stockLabel: "Limited 500",
        price: "0",
        originalPrice: "3200",
        buttonText: "Free claim"
      },
      {
        name: "Reward 2",
        image: "/uploads/sample-item-2.jpg",
        timeLabel: "29 days 3 hours 8 minutes 2 seconds",
        stockLabel: "Limited 500",
        price: "0",
        originalPrice: "3200",
        buttonText: "Free claim"
      },
      {
        name: "Reward 3",
        image: "/uploads/sample-item-3.jpg",
        timeLabel: "29 days 3 hours 8 minutes 2 seconds",
        stockLabel: "Limited 500",
        price: "0",
        originalPrice: "3200",
        buttonText: "Free claim"
      }
    ]
  };
}

function clampCount(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 1;
  return Math.max(1, Math.min(20, number));
}

function cleanText(value, fallback = "", maxLength = 400) {
  if (typeof value !== "string") return fallback;
  return value.slice(0, maxLength);
}

function cleanImageSource(value, fallback = "") {
  return cleanText(value, fallback, 2 * 1024 * 1024);
}

function cleanPassword(value, fallback = DEFAULT_ACCESS_PASSWORD) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : fallback;
}

function sanitizeConfig(input = {}, existing = defaultConfig()) {
  const safe = defaultConfig();
  const defaults = defaultConfig().items;
  const incomingItems = Array.isArray(input.items) ? input.items : [];

  safe.accessPassword = cleanPassword(input.accessPassword, existing.accessPassword || DEFAULT_ACCESS_PASSWORD);
  safe.pageTitle = cleanText(input.pageTitle, safe.pageTitle);
  safe.eyebrow = cleanText(input.eyebrow, safe.eyebrow);
  safe.subtitle = cleanText(input.subtitle, safe.subtitle);
  safe.backgroundColor = cleanText(input.backgroundColor, safe.backgroundColor);
  safe.accentColor = cleanText(input.accentColor, safe.accentColor);
  safe.textColor = cleanText(input.textColor, safe.textColor);
  safe.claimLoadingColor = cleanText(input.claimLoadingColor, safe.claimLoadingColor);
  safe.bannerImage = cleanImageSource(input.bannerImage, safe.bannerImage);
  safe.bannerOverlayText = cleanText(input.bannerOverlayText, safe.bannerOverlayText);
  safe.bannerOverlayBorderColor = cleanText(input.bannerOverlayBorderColor, safe.bannerOverlayBorderColor);
  safe.characterImage = cleanImageSource(input.characterImage, safe.characterImage);
  safe.characterVisible = input.characterVisible !== false;
  safe.sideRibbon = cleanText(input.sideRibbon, safe.sideRibbon);
  safe.claimModalTitleTemplate = cleanText(input.claimModalTitleTemplate, safe.claimModalTitleTemplate);
  safe.claimModalNameLabel = cleanText(input.claimModalNameLabel, safe.claimModalNameLabel);
  safe.claimModalNameValue = cleanText(input.claimModalNameValue, safe.claimModalNameValue);
  safe.claimModalChannelLabel = cleanText(input.claimModalChannelLabel, safe.claimModalChannelLabel);
  safe.claimModalChannelValue = cleanText(input.claimModalChannelValue, safe.claimModalChannelValue);
  safe.claimModalChannelOptions = cleanText(input.claimModalChannelOptions, safe.claimModalChannelOptions);
  safe.claimModalButtonText = cleanText(input.claimModalButtonText, safe.claimModalButtonText);
  safe.claimLoadingText = cleanText(input.claimLoadingText, safe.claimLoadingText);
  safe.claimSuccessText = cleanText(input.claimSuccessText, safe.claimSuccessText);
  safe.equipmentCount = clampCount(input.equipmentCount);
  safe.items = Array.from({ length: 20 }, (_, index) => {
    const item = incomingItems[index] || {};
    const fallback = defaults[index % defaults.length];
    return {
      name: cleanText(item.name, fallback.name),
      image: cleanImageSource(item.image, fallback.image),
      timeLabel: cleanText(item.timeLabel, fallback.timeLabel),
      stockLabel: cleanText(item.stockLabel, fallback.stockLabel),
      price: cleanText(item.price, fallback.price),
      originalPrice: cleanText(item.originalPrice, fallback.originalPrice),
      buttonText: cleanText(item.buttonText, fallback.buttonText)
    };
  });

  return safe;
}

function publicConfig(config) {
  const { accessPassword, ...safeConfig } = config;
  return safeConfig;
}

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function requireSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

async function supabaseFetch(path, options = {}) {
  const { url, key } = requireSupabaseEnv();
  return fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(options.headers || {})
    }
  });
}

async function readConfig() {
  const response = await supabaseFetch(
    `/rest/v1/${CONFIG_TABLE}?id=eq.${encodeURIComponent(CONFIG_ID)}&select=config`
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const rows = await response.json();
  if (!rows.length) return sanitizeConfig(defaultConfig());
  return sanitizeConfig(rows[0].config || {});
}

async function writeConfig(config) {
  const existing = await readConfig();
  const safe = sanitizeConfig(config, existing);
  const response = await supabaseFetch(`/rest/v1/${CONFIG_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      id: CONFIG_ID,
      config: safe,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return safe;
}

function authToken(password) {
  return crypto.createHash("sha256").update(`equipment-campaign:${password}`).digest("hex");
}

function getCookie(headers = {}, name) {
  const cookieHeader = headers.cookie || headers.Cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function isAuthorized(event, config) {
  return getCookie(event.headers, AUTH_COOKIE) === authToken(config.accessPassword);
}

function authCookie(password) {
  return `${AUTH_COOKIE}=${encodeURIComponent(authToken(password))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}`;
}

function unauthorizedResponse() {
  return jsonResponse(401, { error: "Unauthorized" });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Empty image data");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("Image is too large");
  return { contentType: match[1], buffer };
}

function safeFileName(fileName, contentType) {
  const extensionFromType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
  }[contentType] || ".png";
  const base = String(fileName || "asset")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "asset";
  return `${Date.now()}-${base}${extensionFromType}`;
}

function publicStorageUrl(objectPath) {
  const { url } = requireSupabaseEnv();
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${url}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/${encodedPath}`;
}

async function uploadAsset({ dataUrl, fileName }) {
  const { contentType, buffer } = parseDataUrl(dataUrl);
  const objectPath = `uploads/${safeFileName(fileName, contentType)}`;
  const response = await supabaseFetch(
    `/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-upsert": "true"
      },
      body: buffer
    }
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return publicStorageUrl(objectPath);
}

module.exports = {
  authCookie,
  defaultConfig,
  isAuthorized,
  jsonResponse,
  publicConfig,
  readConfig,
  unauthorizedResponse,
  uploadAsset,
  writeConfig
};
