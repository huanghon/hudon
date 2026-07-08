const fallbackConfig = {
  pageTitle: "装备领取活动",
  eyebrow: "前往礼包码兑换",
  subtitle: "限时福利装备领取",
  backgroundColor: "#111820",
  accentColor: "#d71920",
  textColor: "#ffffff",
  claimLoadingColor: "#6fbfff",
  bannerImage: "/uploads/sample-banner.jpg",
  bannerOverlayText: "参与活动即可获得丰厚游戏奖励",
  bannerOverlayBorderColor: "#41caff",
  bannerOverlayTextColor: "#d9f4ff",
  bannerScale: 1.0,
  bannerOverlayTextVisible: true,
  bannerOverlayBorderVisible: true,
  subtitleColor: "#ffffff",
  eyebrowColor: "rgba(255, 255, 255, 0.72)",
  eyebrowFontSize: 15,
  eyebrowFontWeight: 700,
  eyebrowFontFamily: "inherit",
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
  items: []
};

let countdownTimer = null;
let countdownEntries = [];
let activeConfig = fallbackConfig;
let claimTimer = null;
let toastTimer = null;
let activeClaimStockElement = null;

function parseOptions(value) {
  return String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "需要输入访问密码" : "配置读取失败");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function login(password) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "密码错误" : "登录失败");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function setAuthStatus(message) {
  const status = document.getElementById("authStatus");
  if (status) status.textContent = message || "";
}

function showAuthGate(message = "") {
  document.getElementById("authGate").hidden = false;
  document.getElementById("campaignShell").hidden = true;
  setAuthStatus(message);
  window.setTimeout(() => document.getElementById("authPassword")?.focus(), 0);
}

function showCampaign() {
  document.getElementById("authGate").hidden = true;
  document.getElementById("campaignShell").hidden = false;
  setAuthStatus("");
}

async function bootPage() {
  try {
    renderPage(await loadConfig());
    showCampaign();
  } catch (error) {
    if (error.status === 401) {
      showAuthGate();
      return;
    }
    showAuthGate(error.message);
  }
}

async function submitAuth(event) {
  event.preventDefault();
  const input = document.getElementById("authPassword");
  const password = input.value.trim();
  if (!password) {
    setAuthStatus("请输入访问密码");
    return;
  }

  setAuthStatus("验证中...");
  try {
    await login(password);
    input.value = "";
    await bootPage();
  } catch (error) {
    setAuthStatus(error.message);
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "";
}

function setRequiredLabel(id, value) {
  const element = document.getElementById(id);
  const text = String(value || "");
  if (!element) return;

  if (text.trimStart().startsWith("*")) {
    const labelText = text.replace(/^\s*\*\s*/, "");
    element.innerHTML = `<span class="required-mark">*</span>${labelText}`;
    return;
  }

  element.textContent = text;
}

function parseCountdownSeconds(label) {
  const text = String(label || "");
  const days = Number((text.match(/(\d+)\s*天/) || [0, 0])[1]);
  const hours = Number((text.match(/(\d+)\s*时/) || [0, 0])[1]);
  const minutes = Number((text.match(/(\d+)\s*分/) || [0, 0])[1]);
  const seconds = Number((text.match(/(\d+)\s*秒/) || [0, 0])[1]);
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return Number.isFinite(total) && total > 0 ? total : 0;
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${days}天${hours}时${minutes}分${seconds}秒`;
}

function startCountdowns() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  countdownTimer = window.setInterval(() => {
    countdownEntries.forEach((entry) => {
      entry.remaining = Math.max(0, entry.remaining - 1);
      entry.element.textContent = entry.remaining > 0 ? formatCountdown(entry.remaining) : "已结束";
    });
  }, 1000);
}

function openClaimModal(item, stockElement) {
  const modal = document.getElementById("claimModal");
  resetClaimLoading();
  activeClaimStockElement = stockElement || null;
  const titleTemplate = activeConfig.claimModalTitleTemplate || "领取「{item}」";
  const itemName = item?.name || "装备";
  document.getElementById("claimModalTitle").textContent = titleTemplate.replaceAll("{item}", itemName);
  setRequiredLabel("claimNameLabel", activeConfig.claimModalNameLabel || "");
  document.getElementById("claimNameInput").value = activeConfig.claimModalNameValue || "";
  setRequiredLabel("claimChannelLabel", activeConfig.claimModalChannelLabel || "");
  const channelSelect = document.getElementById("claimChannelSelect");
  const options = parseOptions(activeConfig.claimModalChannelOptions);
  channelSelect.innerHTML = "";
  (options.length ? options : ["QQ", "微信"]).forEach((option) => {
    const node = document.createElement("option");
    node.value = option;
    node.textContent = option;
    channelSelect.appendChild(node);
  });
  channelSelect.value = activeConfig.claimModalChannelValue || channelSelect.options[0]?.value || "";
  document.getElementById("claimSubmit").textContent = activeConfig.claimModalButtonText || "点击领取";
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeClaimModal() {
  if (claimTimer) {
    window.clearTimeout(claimTimer);
    claimTimer = null;
  }
  resetClaimLoading();
  activeClaimStockElement = null;
  document.getElementById("claimModal").hidden = true;
  document.body.classList.remove("modal-open");
}

function resetClaimLoading() {
  const loading = document.getElementById("claimLoading");
  const submit = document.getElementById("claimSubmit");
  loading.hidden = true;
  submit.disabled = false;
  submit.textContent = activeConfig.claimModalButtonText || "点击领取";
}

function showClaimResult() {
  const toast = document.getElementById("claimResultToast");
  toast.textContent = activeConfig.claimSuccessText || "领取成功，24小时后登陆游戏查看游戏";
  toast.hidden = false;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function decrementActiveStock() {
  if (!activeClaimStockElement) return;
  activeClaimStockElement.textContent = activeClaimStockElement.textContent.replace(/\d+/, (value) => {
    const nextValue = Math.max(0, Number.parseInt(value, 10) - 1);
    return String(nextValue);
  });
  activeClaimStockElement = null;
}

function submitClaim() {
  const loading = document.getElementById("claimLoading");
  const loadingText = document.getElementById("claimLoadingText");
  const submit = document.getElementById("claimSubmit");

  if (submit.disabled) return;
  loadingText.textContent = activeConfig.claimLoadingText || "领取中";
  loading.hidden = false;
  submit.disabled = true;
  submit.textContent = activeConfig.claimLoadingText || "领取中";

  const delay = 3000 + Math.floor(Math.random() * 1001);
  claimTimer = window.setTimeout(() => {
    claimTimer = null;
    document.getElementById("claimModal").hidden = true;
    document.body.classList.remove("modal-open");
    resetClaimLoading();
    decrementActiveStock();
    showClaimResult();
  }, delay);
}

function renderPage(config) {
  const safeConfig = { ...fallbackConfig, ...config };
  activeConfig = safeConfig;
  document.documentElement.style.setProperty("--bg", safeConfig.backgroundColor);
  document.documentElement.style.setProperty("--accent", safeConfig.accentColor);
  document.documentElement.style.setProperty("--text", safeConfig.textColor);
  document.documentElement.style.setProperty("--subtitle-color", safeConfig.subtitleColor || "rgba(255, 255, 255, 0.72)");
  document.documentElement.style.setProperty("--eyebrow-color", safeConfig.eyebrowColor || "rgba(255, 255, 255, 0.72)");
  document.documentElement.style.setProperty("--eyebrow-size", (safeConfig.eyebrowFontSize || 15) + "px");
  document.documentElement.style.setProperty("--eyebrow-weight", safeConfig.eyebrowFontWeight || 700);
  document.documentElement.style.setProperty("--eyebrow-family", safeConfig.eyebrowFontFamily || "inherit");
  document.documentElement.style.setProperty("--claim-loading", safeConfig.claimLoadingColor || "#6fbfff");
  document.documentElement.style.setProperty("--banner-scale", safeConfig.bannerScale !== undefined ? safeConfig.bannerScale : 1.0);
  document.title = safeConfig.pageTitle || document.title;

  setText("eyebrow", safeConfig.eyebrow);
  setText("pageTitle", safeConfig.pageTitle);
  setText("subtitle", safeConfig.subtitle);
  setText("sideRibbon", safeConfig.sideRibbon);

  const banner = document.getElementById("bannerImage");
  banner.src = safeConfig.bannerImage;
  banner.alt = safeConfig.pageTitle || "活动横幅";

  const bannerOverlay = document.getElementById("bannerOverlayText");
  if (bannerOverlay) {
    bannerOverlay.hidden = safeConfig.bannerOverlayTextVisible === false;
    setText("bannerOverlayText", safeConfig.bannerOverlayText);
    if (safeConfig.bannerOverlayBorderVisible === false) {
      bannerOverlay.classList.add("no-border");
    } else {
      bannerOverlay.classList.remove("no-border");
    }
  }
  document.documentElement.style.setProperty("--banner-line", safeConfig.bannerOverlayBorderColor || "#41caff");
  document.documentElement.style.setProperty("--banner-text", safeConfig.bannerOverlayTextColor || "#d9f4ff");

  const sideAccess = document.getElementById("floatingSideAccess");
  const character = document.getElementById("sideCharacter");
  character.src = safeConfig.characterImage || "/uploads/character-upper.png";
  character.alt = `${safeConfig.sideRibbon || "侧边"}人物`;
  character.hidden = safeConfig.characterVisible === false;
  sideAccess.hidden = safeConfig.characterVisible === false;

  const list = document.getElementById("equipmentList");
  const template = document.getElementById("equipmentTemplate");
  list.innerHTML = "";
  countdownEntries = [];

  const count = Math.max(1, Math.min(20, Number(safeConfig.equipmentCount) || 1));
  safeConfig.items.slice(0, count).forEach((item, index) => {
    const node = template.content.cloneNode(true);
    const timeElement = node.querySelector(".time");
    const remaining = parseCountdownSeconds(item.timeLabel);
    timeElement.textContent = remaining > 0 ? formatCountdown(remaining) : item.timeLabel || "";
    if (remaining > 0) {
      countdownEntries.push({ element: timeElement, remaining });
    }
    const stockElement = node.querySelector(".stock");
    stockElement.textContent = item.stockLabel || "";
    node.querySelector(".rank").textContent = index + 1;
    const image = node.querySelector("img");
    image.src = item.image || safeConfig.bannerImage;
    image.alt = item.name || `装备 ${index + 1}`;
    node.querySelector("h2").textContent = item.name || `装备 ${index + 1}`;
    node.querySelector(".price-row strong").textContent = item.price || "0";
    node.querySelector(".price-row span").textContent = item.originalPrice || "";
    const claimButton = node.querySelector("button");
    claimButton.textContent = item.buttonText || "免费领取";
    claimButton.addEventListener("click", () => openClaimModal(item, stockElement));
    list.appendChild(node);
  });

  startCountdowns();
}

document.getElementById("claimModalClose").addEventListener("click", closeClaimModal);
document.getElementById("claimModal").addEventListener("click", (event) => {
  if (event.target.id === "claimModal") closeClaimModal();
});
document.getElementById("claimSubmit").addEventListener("click", submitClaim);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeClaimModal();
});

document.getElementById("authForm").addEventListener("submit", submitAuth);
bootPage();
