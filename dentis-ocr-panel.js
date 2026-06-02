(function () {
  if (window.DentisOCR) return;

  const OCR_TYPES = {
    patient: {
      label: "患者情報",
      fields: [
        ["lastName", "姓"],
        ["firstName", "名"],
        ["lastNameKana", "セイ"],
        ["firstNameKana", "メイ"],
        ["gender", "性別"],
        ["birthDate", "生年月日"],
        ["postalCode", "郵便番号"],
        ["phone", "電話番号"]
      ]
    },
    insurance: {
      label: "保険",
      fields: [
        ["insurerNumber", "保険者番号"],
        ["symbol", "記号"],
        ["number", "番号"],
        ["branchNumber", "枝番"],
        ["relationship", "続柄"],
        ["insuredName", "被保険者名"],
        ["qualificationDate", "資格取得日"],
        ["expiryDate", "有効期限"],
        ["copay", "患者負担割合"]
      ]
    },
    public: {
      label: "公費",
      fields: [
        ["publicPayerNumber", "公費負担者番号"],
        ["recipientNumber", "受給者番号"],
        ["publicName", "公費名"],
        ["qualificationDate", "資格取得日"],
        ["expiryDate", "有効期限"],
        ["copay", "患者負担割合"]
      ]
    },
    care: {
      label: "介護",
      fields: [
        ["careInsurerNumber", "介護保険者番号"],
        ["careInsuredNumber", "介護保険被保険者番号"],
        ["careCopay", "自己負担率"],
        ["careLevel", "要介護度"],
        ["applicationDate", "介護申請日"],
        ["certificationDate", "介護認定日"],
        ["validFrom", "認定有効期間（開始日）"],
        ["validTo", "認定有効期間（終了日）"],
        ["reductionRate", "減免割合"]
      ]
    }
  };

  const SAMPLE_DATA = {
    patient: {
      lastName: "山田",
      firstName: "太郎",
      lastNameKana: "ヤマダ",
      firstNameKana: "タロウ",
      gender: "男性",
      birthDate: "1955-04-12",
      postalCode: "106-6222",
      phone: "09012345678"
    },
    insurance: {
      insurerNumber: "06123456",
      symbol: "港区",
      number: "1234567",
      branchNumber: "01",
      relationship: "本人",
      insuredName: "山田 太郎",
      qualificationDate: "2024-04-01",
      expiryDate: "2026-07-31",
      copay: "3割"
    },
    public: {
      publicPayerNumber: "80123456",
      recipientNumber: "1234567",
      publicName: "該当公費なし",
      qualificationDate: "2024-04-01",
      expiryDate: "2026-03-31",
      copay: "0"
    },
    care: {
      careInsurerNumber: "131001",
      careInsuredNumber: "0000123456",
      careCopay: "1割",
      careLevel: "要介護2",
      applicationDate: "2025-04-01",
      certificationDate: "2025-04-15",
      validFrom: "2025-05-01",
      validTo: "2027-04-30",
      reductionRate: "0"
    }
  };

  let state = {
    type: "insurance",
    values: { ...SAMPLE_DATA.insurance },
    rawText: ""
  };

  function open() {
    injectStyle();
    const existing = document.getElementById("dentisOcrRoot");
    if (existing) {
      existing.hidden = false;
      return;
    }
    const root = document.createElement("div");
    root.id = "dentisOcrRoot";
    root.innerHTML = renderPanel();
    document.body.appendChild(root);
    bind(root);
  }

  function renderPanel() {
    return `
      <div class="do-backdrop" data-close></div>
      <section class="do-panel" role="dialog" aria-label="Dentis OCR">
        <header class="do-header">
          <div>
            <strong>Dentis OCR</strong>
            <span>撮影して確認後に入力</span>
          </div>
          <button class="do-icon" type="button" data-close aria-label="閉じる">×</button>
        </header>

        <div class="do-tabs">
          ${Object.entries(OCR_TYPES).map(([key, item]) => `<button class="${key === state.type ? "is-active" : ""}" type="button" data-type="${key}">${item.label}</button>`).join("")}
        </div>

        <div class="do-body">
          <label class="do-file">
            <input id="doFile" type="file" accept="image/*" capture="environment">
            <span>撮影・画像選択</span>
          </label>
          <div class="do-row">
            <button class="do-secondary" type="button" data-sample>テスト値を入れる</button>
            <button class="do-secondary" type="button" data-ocr>OCR実行</button>
          </div>
          <p class="do-note">OCR結果は必ず確認してください。読み取りが不安な欄だけ修正してから入力します。</p>
          <div id="doPreview" class="do-preview">${renderFields()}</div>
          <details class="do-raw">
            <summary>読み取りテキスト</summary>
            <textarea id="doRaw" spellcheck="false">${escapeHtml(state.rawText)}</textarea>
          </details>
        </div>

        <footer class="do-footer">
          <button class="do-secondary" type="button" data-close>閉じる</button>
          <button class="do-primary" type="button" data-fill>Dentisへ入力</button>
        </footer>
      </section>
    `;
  }

  function renderFields() {
    return OCR_TYPES[state.type].fields.map(([key, label]) => `
      <label class="do-field">
        <span>${escapeHtml(label)}</span>
        <input data-field="${key}" value="${escapeHtml(state.values[key] || "")}">
      </label>
    `).join("");
  }

  function bind(root) {
    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";
    root.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-close]")) {
        root.hidden = true;
      }
      if (target.matches("[data-type]")) {
        syncValues(root);
        state.type = target.dataset.type;
        state.values = { ...SAMPLE_DATA[state.type] };
        redraw(root);
      }
      if (target.matches("[data-sample]")) {
        state.values = { ...SAMPLE_DATA[state.type] };
        redraw(root);
      }
      if (target.matches("[data-ocr]")) {
        await runOcr(root);
      }
      if (target.matches("[data-fill]")) {
        syncValues(root);
        const result = fillDentisForm(state.type, state.values);
        showToast(`${result.filled}項目を入力しました`);
      }
    });

    root.addEventListener("input", (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.dataset.field) {
        state.values[input.dataset.field] = input.value;
      }
      if (input instanceof HTMLTextAreaElement && input.id === "doRaw") {
        state.rawText = input.value;
        state.values = { ...state.values, ...parseText(state.type, state.rawText) };
        document.getElementById("doPreview").innerHTML = renderFields();
      }
    });
  }

  function redraw(root) {
    root.innerHTML = renderPanel();
  }

  function syncValues(root) {
    root.querySelectorAll("[data-field]").forEach((input) => {
      state.values[input.dataset.field] = input.value;
    });
    const raw = root.querySelector("#doRaw");
    if (raw) state.rawText = raw.value;
  }

  async function runOcr(root) {
    const file = root.querySelector("#doFile").files[0];
    if (!file) {
      showToast("先に画像を選択してください");
      return;
    }
    const button = root.querySelector("[data-ocr]");
    button.textContent = "読み取り中...";
    button.disabled = true;
    try {
      await loadTesseract();
      const result = await window.Tesseract.recognize(file, "jpn+eng", {
        logger: () => {}
      });
      state.rawText = result.data.text || "";
      state.values = { ...state.values, ...parseText(state.type, state.rawText) };
      redraw(root);
      showToast("OCRが完了しました");
    } catch (error) {
      console.error(error);
      showToast("OCRに失敗しました。テキスト欄へ手入力してください");
    } finally {
      button.disabled = false;
      button.textContent = "OCR実行";
    }
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function parseText(type, text) {
    const compact = normalizeText(text);
    const values = {};
    const date = extractDates(compact);
    const numbers = compact.match(/\d{6,10}/g) || [];

    if (type === "insurance") {
      values.insurerNumber = findAfter(compact, /保険者番号/) || numbers.find((n) => n.length === 8) || "";
      values.number = findAfter(compact, /番号/) || numbers.find((n) => n.length >= 6 && n.length <= 7) || "";
      values.branchNumber = findAfter(compact, /枝番/) || "";
      values.symbol = findAfter(compact, /記号/) || "";
      values.relationship = /家族/.test(compact) ? "家族" : /本人/.test(compact) ? "本人" : "";
      values.qualificationDate = date[0] || "";
      values.expiryDate = date[1] || "";
      values.copay = extractCopay(compact);
    }

    if (type === "public") {
      values.publicPayerNumber = findAfter(compact, /公費負担者番号|負担者番号/) || numbers.find((n) => n.length === 8) || "";
      values.recipientNumber = findAfter(compact, /受給者番号/) || numbers.find((n) => n.length >= 6 && n.length <= 7) || "";
      values.qualificationDate = date[0] || "";
      values.expiryDate = date[1] || "";
      values.copay = extractCopay(compact).replace("割", "") || "";
    }

    if (type === "care") {
      values.careInsurerNumber = findAfter(compact, /保険者番号/) || numbers.find((n) => n.length === 6) || "";
      values.careInsuredNumber = findAfter(compact, /被保険者番号/) || numbers.find((n) => n.length === 10) || "";
      values.careCopay = extractCopay(compact);
      values.careLevel = (compact.match(/要介護\s*[1-5]|要支援\s*[1-2]/) || [""])[0].replace(/\s/g, "");
      values.validFrom = date[0] || "";
      values.validTo = date[1] || "";
    }

    if (type === "patient") {
      values.birthDate = date[0] || "";
      values.postalCode = (compact.match(/\d{3}-?\d{4}/) || [""])[0];
      values.gender = /女性/.test(compact) ? "女性" : /男性/.test(compact) ? "男性" : "";
    }

    return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
  }

  function normalizeText(text) {
    return text
      .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
      .replace(/[ー－―]/g, "-")
      .replace(/[：]/g, ":")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findAfter(text, labelPattern) {
    const match = text.match(new RegExp(`${labelPattern.source}\\s*[:：]?\\s*([A-Za-z0-9一-龠ぁ-んァ-ン\\-]+)`));
    return match ? match[1] : "";
  }

  function extractDates(text) {
    const dates = [];
    const western = text.match(/\d{4}[年\/.-]\d{1,2}[月\/.-]\d{1,2}日?/g) || [];
    western.forEach((item) => dates.push(toIsoDate(item)));
    const japanese = text.match(/[令平成昭和]{1,2}\s*\d{1,2}年\s*\d{1,2}月\s*\d{1,2}日/g) || [];
    japanese.forEach((item) => dates.push(toIsoDate(item)));
    return dates.filter(Boolean);
  }

  function toIsoDate(value) {
    const text = value.replace(/\s/g, "");
    const era = text.match(/(令和|平成|昭和)(\d{1,2})年(\d{1,2})月(\d{1,2})日?/);
    if (era) {
      const bases = { "令和": 2018, "平成": 1988, "昭和": 1925 };
      return formatDate(bases[era[1]] + Number(era[2]), era[3], era[4]);
    }
    const western = text.match(/(\d{4})[年\/.-](\d{1,2})[月\/.-](\d{1,2})日?/);
    return western ? formatDate(western[1], western[2], western[3]) : "";
  }

  function formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function extractCopay(text) {
    const match = text.match(/([123])\s*割|([0-9]{1,2})\s*%/);
    if (!match) return "";
    return match[1] ? `${match[1]}割` : match[2];
  }

  function fillDentisForm(type, values) {
    clickTab(OCR_TYPES[type].label);
    let filled = 0;
    OCR_TYPES[type].fields.forEach(([key, label]) => {
      const value = values[key];
      if (!value) return;
      const ok = setFieldByLabel(label, value);
      if (ok) filled += 1;
    });
    return { filled };
  }

  function clickTab(label) {
    const target = [...document.querySelectorAll("button,a,[role='tab'],li,span")]
      .find((el) => !el.closest("#dentisOcrRoot") && isVisible(el) && clean(el.textContent) === label);
    if (target) target.click();
  }

  function setFieldByLabel(label, value) {
    const aliases = buildAliases(label);
    for (const alias of aliases) {
      const field = findField(alias);
      if (field && setElementValue(field, value)) return true;
    }
    return false;
  }

  function buildAliases(label) {
    const map = {
      "患者負担割合": ["患者負担割合", "負担割合"],
      "自己負担率": ["自己負担率", "自己負担"],
      "認定有効期間（開始日）": ["認定有効期間（開始日）", "開始日"],
      "認定有効期間（終了日）": ["認定有効期間（終了日）", "終了日"]
    };
    return map[label] || [label];
  }

  function findField(label) {
    const labels = [...document.querySelectorAll("label,span,p,th,dt,legend")].filter((el) => {
      if (el.closest("#dentisOcrRoot") || !isVisible(el)) return false;
      const text = clean(el.textContent);
      const target = clean(label);
      if (!labelMatches(text, target)) return false;
      if (el.tagName !== "LABEL" && text.length > clean(label).length + 8) return false;
      return true;
    });
    for (const labelEl of labels) {
      const direct = labelEl.querySelector("input,select,textarea");
      if (direct && isUsable(direct)) return direct;
      const container = closestContainer(labelEl);
      const field = container && container.querySelectorAll("input:not([type=hidden]),select,textarea").length === 1
        ? container.querySelector("input:not([type=hidden]),select,textarea")
        : null;
      if (field && isUsable(field)) return field;
      const next = findNextField(labelEl);
      if (next && isUsable(next)) return next;
    }
    return null;
  }

  function closestContainer(el) {
    return el.closest(".form-group,.ant-form-item,.field,td,li,label");
  }

  function findNextField(el) {
    let current = el;
    for (let i = 0; i < 8 && current; i += 1) {
      current = current.nextElementSibling;
      if (!current) break;
      if (current.matches && current.matches("input,select,textarea")) return current;
      const nested = current.querySelector && current.querySelector("input:not([type=hidden]),select,textarea");
      if (nested) return nested;
    }
    return null;
  }

  function setElementValue(el, value) {
    if (el.tagName === "SELECT") {
      const option = [...el.options].find((item) => clean(item.textContent).includes(clean(value)) || clean(item.value) === clean(value));
      if (option) el.value = option.value;
      else el.selectedIndex = Math.max(0, el.selectedIndex);
    } else if (el.type === "radio" || el.type === "checkbox") {
      el.checked = true;
    } else {
      const nativeSetter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set;
      if (nativeSetter) nativeSetter.call(el, value);
      else el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function isUsable(el) {
    return !el.disabled && el.type !== "hidden" && el.id !== "doFile" && !el.closest("#dentisOcrRoot") && isVisible(el);
  }

  function isVisible(el) {
    return Boolean(el.getClientRects && el.getClientRects().length);
  }

  function labelMatches(text, target) {
    const simplified = text.replace(/必須/g, "");
    if (simplified.startsWith(target)) return true;
    if (target.length <= 3) return false;
    return simplified.includes(target);
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").replace(/[()（）]/g, "");
  }

  function injectStyle() {
    if (document.getElementById("dentisOcrStyle")) return;
    const style = document.createElement("style");
    style.id = "dentisOcrStyle";
    style.textContent = `
      #dentisOcrRoot, #dentisOcrRoot * { box-sizing: border-box; }
      #dentisOcrRoot { position: fixed; inset: 0; z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172335; }
      #dentisOcrRoot[hidden] { display: none; }
      .do-backdrop { position: absolute; inset: 0; background: rgba(16, 24, 40, .26); }
      .do-panel { position: absolute; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); width: min(520px, calc(100vw - 24px)); max-height: min(760px, calc(100vh - 24px)); display: grid; grid-template-rows: auto auto 1fr auto; overflow: hidden; border-radius: 8px; background: #fff; box-shadow: 0 18px 56px rgba(16, 24, 40, .24); border: 1px solid #d7e0ea; }
      .do-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #d7e0ea; }
      .do-header strong { display: block; font-size: 18px; }
      .do-header span, .do-note { color: #5e6b7c; font-size: 13px; }
      .do-icon { width: 40px; height: 40px; border: 1px solid #d7e0ea; border-radius: 8px; background: #fff; font-size: 24px; line-height: 1; }
      .do-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 10px; background: #f5f8fb; border-bottom: 1px solid #d7e0ea; }
      .do-tabs button, .do-secondary, .do-primary, .do-file span { min-height: 44px; border-radius: 8px; border: 1px solid #d7e0ea; font: inherit; font-weight: 700; }
      .do-tabs button { background: #fff; color: #172335; }
      .do-tabs .is-active { color: #fff; background: #2563eb; border-color: #2563eb; }
      .do-body { overflow: auto; padding: 14px; }
      .do-file input { display: none; }
      .do-file span { display: grid; place-items: center; width: 100%; color: #fff; background: #0f766e; border-color: #0f766e; }
      .do-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .do-secondary { background: #fff; color: #172335; }
      .do-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
      .do-note { margin: 10px 0; line-height: 1.55; }
      .do-preview { display: grid; gap: 10px; }
      .do-field { display: grid; gap: 5px; font-size: 13px; font-weight: 700; color: #64748b; }
      .do-field input, .do-raw textarea { width: 100%; min-height: 42px; border: 1px solid #cbd8e5; border-radius: 8px; padding: 8px 10px; font: 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172335; background: #fff; }
      .do-raw { margin-top: 12px; }
      .do-raw summary { min-height: 38px; padding-top: 8px; color: #5e6b7c; font-weight: 700; }
      .do-raw textarea { min-height: 112px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; }
      .do-footer { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 12px 14px; border-top: 1px solid #d7e0ea; background: #fff; }
      .do-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2147483647; padding: 10px 14px; border-radius: 8px; color: #fff; background: rgba(23, 35, 53, .94); font-weight: 700; }
      @media (max-width: 640px) { .do-panel { left: 8px; right: 8px; bottom: 8px; width: auto; max-height: calc(100vh - 16px); } .do-tabs { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
  }

  function showToast(message) {
    const old = document.querySelector(".do-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "do-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.DentisOCR = {
    open,
    parseText,
    fillDentisForm,
    setFieldByLabel
  };
})();
