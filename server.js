const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const CONFIG_FILE = path.join(DATA_DIR, "site-config.json");
const SEED_CONFIG_FILE = process.env.SEED_CONFIG_FILE
  ? path.resolve(process.env.SEED_CONFIG_FILE)
  : path.join(ROOT, "data.seed", "site-config.json");
const AUTH_COOKIE = "site_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_ACCESS_PASSWORD = "123456";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function ensureConfig() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    if (fs.existsSync(SEED_CONFIG_FILE)) {
      fs.copyFileSync(SEED_CONFIG_FILE, CONFIG_FILE);
      return;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig(), null, 2), "utf8");
  }
}

function defaultConfig() {
  return {
    accessPassword: DEFAULT_ACCESS_PASSWORD,
    pageTitle: "《和平精英》主播专属赠送",
    eyebrow: "前往礼包码兑换",
    subtitle: "限时福利装备领取",
    backgroundColor: "#111820",
    accentColor: "#d71920",
    textColor: "#ffffff",
    claimLoadingColor: "#6fbfff",
    bannerImage: "/uploads/sample-banner.jpg",
    bannerOverlayText: "参与活动即可获得丰厚游戏奖励",
    bannerOverlayBorderColor: "#41caff",
    bannerScale: 1.0,
    bannerOverlayTextVisible: true,
    bannerOverlayBorderVisible: true,
    subtitleColor: "#ffffff",
    eyebrowColor: "#ffffff",
    eyebrowFontSize: 15,
    eyebrowFontWeight: "700",
    characterImage: "/uploads/character-upper.png",
    characterVisible: true,
    sideRibbon: "权益退订通道",
    claimModalTitleTemplate: "领取「{item}」",
    claimModalNameLabel: "* 游戏名称",
    claimModalNameValue: "天成",
    claimModalChannelLabel: "* 渠道",
    claimModalChannelValue: "QQ",
    claimModalChannelOptions: "QQ,微信",
    claimModalButtonText: "点击领取",
    claimLoadingText: "领取中",
    claimSuccessText: "领取成功，24小时后登陆游戏查看游戏",
    equipmentCount: 20,
    items: [
      {
        name: "熔岩双刃",
        image: "/uploads/sample-item-1.jpg",
        timeLabel: "29天23时59分14秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "3200",
        buttonText: "免费领取"
      },
      {
        name: "战镰-碎刃",
        image: "/uploads/sample-item-2.jpg",
        timeLabel: "29天23时58分42秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "3200",
        buttonText: "免费领取"
      },
      {
        name: "弗拉迪尾刺",
        image: "/uploads/sample-item-3.jpg",
        timeLabel: "29天23时58分42秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "3200",
        buttonText: "免费领取"
      },
      {
        name: "双节棍",
        image: "/uploads/sample-item-1.jpg",
        timeLabel: "29天23时58分42秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "1800",
        buttonText: "立即领取"
      },
      {
        name: "能量长枪",
        image: "/uploads/sample-item-2.jpg",
        timeLabel: "29天23时58分42秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "2600",
        buttonText: "立即领取"
      },
      {
        name: "赤焰短刃",
        image: "/uploads/sample-item-3.jpg",
        timeLabel: "29天23时58分42秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "2600",
        buttonText: "立即领取"
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

function sanitizeConfig(input, existing = defaultConfig()) {
  const safe = defaultConfig();
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
  safe.bannerScale = Number(input.bannerScale) || 1.0;
  safe.bannerOverlayTextVisible = input.bannerOverlayTextVisible !== false;
  safe.bannerOverlayBorderVisible = input.bannerOverlayBorderVisible !== false;
  safe.subtitleColor = cleanText(input.subtitleColor, safe.subtitleColor);
  safe.eyebrowColor = cleanText(input.eyebrowColor, safe.eyebrowColor);
  safe.eyebrowFontSize = Number(input.eyebrowFontSize) || 15;
  safe.eyebrowFontWeight = cleanText(input.eyebrowFontWeight, safe.eyebrowFontWeight);
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

  const incomingItems = Array.isArray(input.items) ? input.items : [];
  safe.items = Array.from({ length: 20 }, (_, index) => {
    const item = incomingItems[index] || {};
    const fallback = defaultConfig().items[index % defaultConfig().items.length];
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

function readConfig() {
  ensureConfig();
  const raw = fs.readFileSync(CONFIG_FILE, "utf8");
  return sanitizeConfig(JSON.parse(raw));
}

function writeConfig(config) {
  ensureConfig();
  const existing = readConfig();
  const safe = sanitizeConfig(config, existing);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(safe, null, 2), "utf8");
  return safe;
}

function publicConfig(config) {
  const { accessPassword, ...safeConfig } = config;
  return safeConfig;
}

function authToken(password) {
  return crypto.createHash("sha256").update(`equipment-campaign:${password}`).digest("hex");
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function isAuthorized(req, config = readConfig()) {
  return getCookie(req, AUTH_COOKIE) === authToken(config.accessPassword);
}

function authCookie(password) {
  return `${AUTH_COOKIE}=${encodeURIComponent(authToken(password))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}`;
}

function sendUnauthorized(res) {
  send(res, 401, JSON.stringify({ error: "需要输入访问密码" }));
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname === "/healthz" && req.method === "GET") {
      send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/config" && req.method === "GET") {
      const config = readConfig();
      if (!isAuthorized(req, config)) {
        sendUnauthorized(res);
        return;
      }
      send(res, 200, JSON.stringify(publicConfig(config)));
      return;
    }

    if (url.pathname === "/api/config" && req.method === "PUT") {
      const existing = readConfig();
      if (!isAuthorized(req, existing)) {
        sendUnauthorized(res);
        return;
      }
      const body = await readBody(req);
      const config = JSON.parse(body);
      const updated = writeConfig(config);
      send(res, 200, JSON.stringify(publicConfig(updated)), "application/json; charset=utf-8", {
        "Set-Cookie": authCookie(updated.accessPassword)
      });
      return;
    }

    if (url.pathname === "/api/auth" && req.method === "POST") {
      const body = await readBody(req);
      const { password } = JSON.parse(body || "{}");
      const config = readConfig();
      if (String(password || "") !== config.accessPassword) {
        send(res, 401, JSON.stringify({ error: "密码错误" }));
        return;
      }
      send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8", {
        "Set-Cookie": authCookie(config.accessPassword)
      });
      return;
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      const existing = readConfig();
      if (!isAuthorized(req, existing)) {
        sendUnauthorized(res);
        return;
      }
      send(res, 200, JSON.stringify(publicConfig(writeConfig({
        ...defaultConfig(),
        accessPassword: existing.accessPassword
      }))));
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }));
  }
});

ensureConfig();
server.listen(PORT, () => {
  console.log(`Equipment campaign site running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
