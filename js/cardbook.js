(() => {
  /*
   * 正式上線時，請把 API_BASE 改成 Steven 建立的 HTTPS API 網址。
   * 同網域部署時可維持空字串，例如 /api/cardbook/login。
   */
  const API_BASE = "";

  const state = {
    account: "",
    characters: [],
    character: null,
    cards: [],
    type: "全部",
    status: "all",
    keyword: "",
    view: "cards",
    statsScope: "全部"
  };

  const $ = id => document.getElementById(id);

  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("伺服器回傳格式錯誤。");
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "查詢失敗，請稍後再試。");
    }

    return result;
  }

  function setLoading(isLoading) {
    $("loginButton").disabled = isLoading;
    $("loginButton").textContent = isLoading ? "登入中…" : "登入查詢";
  }

  async function login(event) {
    event.preventDefault();

    const account = $("accountInput").value.trim();
    const password = $("passwordInput").value;

    if (!account || !password) {
      $("loginMessage").textContent = "請輸入帳號與密碼。";
      return;
    }

    setLoading(true);
    $("loginMessage").textContent = "";

    try {
      const result = await request("/api/cardbook/login", {
        method: "POST",
        body: JSON.stringify({ account, password })
      });

      state.account = result.account || account;
      state.characters = Array.isArray(result.characters) ? result.characters : [];

      if (!state.characters.length) {
        throw new Error("此帳號底下沒有角色資料。");
      }

      $("accountName").textContent = state.account;
      $("loginPanel").hidden = true;
      $("dashboard").hidden = false;
      renderCharacterTabs();

      await selectCharacter(state.characters[0].objid);
      $("passwordInput").value = "";
    } catch (error) {
      $("loginMessage").textContent = error.message;
    } finally {
      setLoading(false);
    }
  }

  async function selectCharacter(objid) {
    document.querySelectorAll(".character-button").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.objid) === Number(objid));
    });

    $("cardGrid").innerHTML = `<div class="cardbook-empty">正在讀取角色卡冊…</div>`;

    try {
      const result = await request(`/api/cardbook/character?objid=${encodeURIComponent(objid)}`);
      state.character = result.character;
      state.cards = Array.isArray(result.cards) ? result.cards : [];

      $("characterName").textContent = state.character?.name || "未命名角色";
      updateSummary();
      renderCards();
      renderStats();
    } catch (error) {
      $("cardGrid").innerHTML = `<div class="cardbook-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderCharacterTabs() {
    $("characterTabs").innerHTML = state.characters.map((character, index) => `
      <button
        type="button"
        class="character-button ${index === 0 ? "active" : ""}"
        data-objid="${character.objid}">
        ${escapeHtml(character.name || character.char_name)}
      </button>
    `).join("");
  }

  function updateSummary() {
    const transforms = state.cards.filter(card => card.type === "變身");
    const dolls = state.cards.filter(card => card.type === "娃娃");
    const transformOwned = transforms.filter(card => card.owned).length;
    const dollOwned = dolls.filter(card => card.owned).length;
    const total = state.cards.length;
    const owned = state.cards.filter(card => card.owned).length;

    $("transformProgress").textContent = `${transformOwned} / ${transforms.length}`;
    $("dollProgress").textContent = `${dollOwned} / ${dolls.length}`;
    $("totalProgress").textContent = total ? `${Math.round(owned / total * 100)}%` : "0%";
  }

  function filteredCards() {
    const keyword = state.keyword.toLowerCase();

    return state.cards.filter(card => {
      if (state.type !== "全部" && card.type !== state.type) return false;
      if (state.status === "owned" && !card.owned) return false;
      if (state.status === "missing" && card.owned) return false;

      if (keyword) {
        const text = [
          card.name,
          card.rarity,
          ...(Array.isArray(card.stats) ? card.stats : [])
        ].join(" ").toLowerCase();

        if (!text.includes(keyword)) return false;
      }

      return true;
    });
  }

  function renderCards() {
    const cards = filteredCards();
    $("cardListTitle").textContent = state.type === "全部" ? "全部卡片" : `${state.type}卡片`;
    $("cardResultCount").textContent = `顯示 ${cards.length} 張`;

    $("cardGrid").innerHTML = cards.length ? cards.map(card => `
      <article class="collection-card ${card.owned ? "" : "missing"}">
        <div class="collection-card-head">
          <div>
            <div class="collection-card-name">${escapeHtml(card.name)}</div>
            <div class="collection-meta">
              <span class="rarity rarity-${escapeHtml(card.rarity || "其他")}">${escapeHtml(card.rarity || "其他")}階</span>
              <span>${escapeHtml(card.type)}</span>
            </div>
          </div>
          <span class="collection-status ${card.owned ? "owned" : "not-owned"}">
            ${card.owned ? "已蒐藏" : "未蒐藏"}
          </span>
        </div>
        ${Array.isArray(card.stats) && card.stats.length ? `
          <div class="collection-abilities">${card.stats.map(escapeHtml).join("、")}</div>
        ` : ""}
      </article>
    `).join("") : `<div class="cardbook-empty">沒有符合條件的卡片。</div>`;
  }

  function parseStat(value) {
    const match = String(value).match(/^(.+?)([+-]\d+)$/);
    return match ? { name: match[1], value: Number(match[2]) } : null;
  }

  function renderStats() {
    let cards = state.cards.filter(card => card.owned);
    if (state.statsScope !== "全部") {
      cards = cards.filter(card => card.type === state.statsScope);
    }

    const totals = new Map();
    const sources = new Map();

    cards.forEach(card => {
      (card.stats || []).forEach(stat => {
        const parsed = parseStat(stat);
        if (!parsed) return;
        totals.set(parsed.name, (totals.get(parsed.name) || 0) + parsed.value);
        sources.set(parsed.name, (sources.get(parsed.name) || 0) + 1);
      });
    });

    const rows = [...totals.entries()]
      .filter(([, value]) => value !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0], "zh-Hant"));

    $("statsTitle").textContent = state.statsScope === "全部"
      ? "已蒐藏卡片附加能力總計"
      : `已蒐藏${state.statsScope}卡附加能力總計`;
    $("statsCount").textContent = `計算 ${cards.length} 張已蒐藏卡片`;

    $("statsGrid").innerHTML = rows.length ? rows.map(([name, value]) => `
      <article class="ability-card">
        <div>${escapeHtml(name)}</div>
        <strong>${value > 0 ? "+" : ""}${value}</strong>
        <span>來自 ${sources.get(name)} 張卡片</span>
      </article>
    `).join("") : `<div class="cardbook-empty">目前沒有可統計的附加能力。</div>`;
  }

  async function logout() {
    try {
      await request("/api/cardbook/logout", {
        method: "POST",
        body: "{}"
      });
    } catch {
      // 即使伺服器登出失敗，仍清除前端狀態。
    }

    state.account = "";
    state.characters = [];
    state.character = null;
    state.cards = [];

    $("dashboard").hidden = true;
    $("loginPanel").hidden = false;
    $("accountInput").value = "";
    $("passwordInput").value = "";
    $("loginMessage").textContent = "";
  }

  function switchView(view) {
    state.view = view;
    $("cardsView").hidden = view !== "cards";
    $("statsView").hidden = view !== "stats";
    $("cardControls").hidden = view !== "cards";

    document.querySelectorAll(".view-button").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });

    if (view === "stats") renderStats();
  }

  $("loginForm").addEventListener("submit", login);
  $("logoutButton").addEventListener("click", logout);

  $("characterTabs").addEventListener("click", event => {
    const button = event.target.closest(".character-button");
    if (button) selectCharacter(button.dataset.objid);
  });

  document.querySelectorAll(".view-button").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".type-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".type-button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      state.type = button.dataset.type;
      renderCards();
    });
  });

  $("statusFilter").addEventListener("change", event => {
    state.status = event.target.value;
    renderCards();
  });

  $("cardSearch").addEventListener("input", event => {
    state.keyword = event.target.value.trim();
    renderCards();
  });

  document.querySelectorAll(".scope-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".scope-button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      state.statsScope = button.dataset.scope;
      renderStats();
    });
  });
})();
