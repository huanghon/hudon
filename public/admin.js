let currentConfig = null;

const form = document.getElementById("adminForm");
const itemsEditor = document.getElementById("itemsEditor");
const itemTemplate = document.getElementById("itemEditorTemplate");
const saveStatus = document.getElementById("saveStatus");
const MAX_UPLOAD_SIZE = 3 * 1024 * 1024;

async function fetchConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "需要输入访问密码" : "配置读取失败");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function saveConfig(config) {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "需要重新输入访问密码" : "保存失败");
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
  document.getElementById("adminLayout").hidden = true;
  setAuthStatus(message);
  window.setTimeout(() => document.getElementById("authPassword")?.focus(), 0);
}

function showAdmin() {
  document.getElementById("authGate").hidden = true;
  document.getElementById("adminLayout").hidden = false;
  setAuthStatus("");
}

function clampEquipmentCount(value) {
  const count = Number.parseInt(value, 10);
  if (Number.isNaN(count)) return 1;
  return Math.max(1, Math.min(20, count));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      reject(new Error("图片不能超过 3MB，建议先压缩后再上传。"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      dataUrl
    })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Image upload failed");
  }
  const payload = await response.json();
  return payload.url;
}

function fillForm(config) {
  currentConfig = config;
  form.elements.accessPassword.value = "";
  form.elements.eyebrow.value = config.eyebrow || "";
  form.elements.pageTitle.value = config.pageTitle || "";
  form.elements.subtitle.value = config.subtitle || "";
  form.elements.sideRibbon.value = config.sideRibbon || "";
  form.elements.characterImage.value = config.characterImage || "/uploads/character-upper.png";
  form.elements.characterVisible.checked = config.characterVisible !== false;
  form.elements.claimModalTitleTemplate.value = config.claimModalTitleTemplate || "领取「{item}」";
  form.elements.claimModalNameLabel.value = config.claimModalNameLabel || "* 游戏名称";
  form.elements.claimModalNameValue.value = config.claimModalNameValue || "天成";
  form.elements.claimModalChannelLabel.value = config.claimModalChannelLabel || "* 渠道";
  form.elements.claimModalChannelValue.value = config.claimModalChannelValue || "QQ";
  form.elements.claimModalChannelOptions.value = config.claimModalChannelOptions || "QQ,微信";
  form.elements.claimModalButtonText.value = config.claimModalButtonText || "点击领取";
  form.elements.claimLoadingText.value = config.claimLoadingText || "领取中";
  form.elements.claimSuccessText.value = config.claimSuccessText || "领取成功，24小时后登陆游戏查看游戏";
  form.elements.backgroundColor.value = config.backgroundColor || "#111820";
  form.elements.accentColor.value = config.accentColor || "#d71920";
  form.elements.textColor.value = config.textColor || "#ffffff";
  form.elements.subtitleColor.value = config.subtitleColor || "#ffffff";
  form.elements.eyebrowColor.value = config.eyebrowColor || "#ffffff";
  form.elements.eyebrowFontSize.value = config.eyebrowFontSize || 15;
  form.elements.eyebrowFontWeight.value = config.eyebrowFontWeight || "700";
  form.elements.eyebrowFontFamily.value = config.eyebrowFontFamily || "inherit";
  form.elements.claimLoadingColor.value = config.claimLoadingColor || "#6fbfff";
  form.elements.equipmentCount.value = clampEquipmentCount(config.equipmentCount);
  form.elements.bannerImage.value = config.bannerImage || "";
  form.elements.bannerScale.value = config.bannerScale !== undefined ? config.bannerScale : 1.0;
  form.elements.bannerOverlayText.value = config.bannerOverlayText || "参与活动即可获得丰厚游戏奖励";
  form.elements.bannerOverlayTextVisible.checked = config.bannerOverlayTextVisible !== false;
  form.elements.bannerOverlayBorderVisible.checked = config.bannerOverlayBorderVisible !== false;
  form.elements.bannerOverlayBorderColor.value = config.bannerOverlayBorderColor || "#41caff";
  form.elements.bannerOverlayTextColor.value = config.bannerOverlayTextColor || "#d9f4ff";
  renderItemEditors();
}

function renderItemEditors() {
  itemsEditor.innerHTML = "";
  const count = clampEquipmentCount(form.elements.equipmentCount.value);
  const items = currentConfig.items || [];

  for (let index = 0; index < count; index += 1) {
    if (!items[index]) {
      items[index] = {
        name: `装备 ${index + 1}`,
        image: "/uploads/sample-item-1.jpg",
        timeLabel: "29天23时59分14秒",
        stockLabel: "限量 500 份",
        price: "0",
        originalPrice: "3200",
        buttonText: "免费领取"
      };
    }

    const node = itemTemplate.content.cloneNode(true);
    const card = node.querySelector(".item-editor-card");
    card.dataset.index = index;
    node.querySelector("h3").textContent = `装备 ${index + 1}`;
    node.querySelectorAll("[data-field]").forEach((input) => {
      input.value = items[index][input.dataset.field] || "";
      input.addEventListener("input", () => {
        currentConfig.items[index][input.dataset.field] = input.value;
      });
    });
    node.querySelector(".item-upload").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        saveStatus.textContent = "Uploading image...";
        const imageUrl = await uploadImageFile(file);
        currentConfig.items[index].image = imageUrl;
        card.querySelector('[data-field="image"]').value = imageUrl;
        saveStatus.textContent = "";
      } catch (error) {
        saveStatus.textContent = error.message;
      }
    });
    itemsEditor.appendChild(node);
  }
}

function collectConfig() {
  const config = {
    ...currentConfig,
    eyebrow: form.elements.eyebrow.value.trim(),
    pageTitle: form.elements.pageTitle.value.trim(),
    subtitle: form.elements.subtitle.value.trim(),
    sideRibbon: form.elements.sideRibbon.value.trim(),
    characterImage: form.elements.characterImage.value.trim(),
    characterVisible: form.elements.characterVisible.checked,
    claimModalTitleTemplate: form.elements.claimModalTitleTemplate.value.trim(),
    claimModalNameLabel: form.elements.claimModalNameLabel.value.trim(),
    claimModalNameValue: form.elements.claimModalNameValue.value.trim(),
    claimModalChannelLabel: form.elements.claimModalChannelLabel.value.trim(),
    claimModalChannelValue: form.elements.claimModalChannelValue.value.trim(),
    claimModalButtonText: form.elements.claimModalButtonText.value.trim(),
    claimLoadingText: form.elements.claimLoadingText.value.trim(),
    claimSuccessText: form.elements.claimSuccessText.value.trim(),
    backgroundColor: form.elements.backgroundColor.value,
    accentColor: form.elements.accentColor.value,
    textColor: form.elements.textColor.value,
    subtitleColor: form.elements.subtitleColor.value,
    eyebrowColor: form.elements.eyebrowColor.value,
    eyebrowFontSize: Number(form.elements.eyebrowFontSize.value) || 15,
    eyebrowFontWeight: form.elements.eyebrowFontWeight.value,
    eyebrowFontFamily: form.elements.eyebrowFontFamily.value,
    claimLoadingColor: form.elements.claimLoadingColor.value,
    equipmentCount: clampEquipmentCount(form.elements.equipmentCount.value),
    bannerImage: form.elements.bannerImage.value.trim(),
    bannerScale: Number(form.elements.bannerScale.value) || 1.0,
    bannerOverlayText: form.elements.bannerOverlayText.value.trim(),
    bannerOverlayTextVisible: form.elements.bannerOverlayTextVisible.checked,
    bannerOverlayBorderVisible: form.elements.bannerOverlayBorderVisible.checked,
    bannerOverlayBorderColor: form.elements.bannerOverlayBorderColor.value,
    bannerOverlayTextColor: form.elements.bannerOverlayTextColor.value,
    claimModalChannelOptions: form.elements.claimModalChannelOptions.value.trim(),
    items: currentConfig.items
  };

  const accessPassword = form.elements.accessPassword.value.trim();
  if (accessPassword) config.accessPassword = accessPassword;
  return config;
}

function refreshPreview() {
  const iframe = document.querySelector(".preview-frame iframe");
  iframe.src = `/?t=${Date.now()}`;
}

form.elements.equipmentCount.addEventListener("input", () => {
  currentConfig.equipmentCount = clampEquipmentCount(form.elements.equipmentCount.value);
  renderItemEditors();
});

document.getElementById("bannerUpload").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    saveStatus.textContent = "Uploading image...";
    form.elements.bannerImage.value = await uploadImageFile(file);
    saveStatus.textContent = "";
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

document.getElementById("characterUpload").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    saveStatus.textContent = "Uploading image...";
    form.elements.characterImage.value = await uploadImageFile(file);
    saveStatus.textContent = "";
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveStatus.textContent = "保存中...";
  try {
    currentConfig = await saveConfig(collectConfig());
    form.elements.accessPassword.value = "";
    saveStatus.textContent = "已保存";
    refreshPreview();
    window.setTimeout(() => {
      saveStatus.textContent = "";
    }, 1800);
  } catch (error) {
    saveStatus.textContent = error.message;
    if (error.status === 401) showAuthGate(error.message);
  }
});

document.getElementById("resetButton").addEventListener("click", async () => {
  saveStatus.textContent = "恢复中...";
  const response = await fetch("/api/reset", { method: "POST" });
  if (response.status === 401) {
    showAuthGate("需要重新输入访问密码");
    return;
  }
  currentConfig = await response.json();
  fillForm(currentConfig);
  refreshPreview();
  saveStatus.textContent = "已恢复默认";
});

async function bootAdmin() {
  try {
    fillForm(await fetchConfig());
    showAdmin();
    refreshPreview();
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
    await bootAdmin();
  } catch (error) {
    setAuthStatus(error.message);
  }
}

document.getElementById("authForm").addEventListener("submit", submitAuth);
bootAdmin();
