(() => {
  const state = { q: "", filter: "全部", sort: "name", page: 1, size: 36 };
  let DATA = [];

  const el = {
    q: document.querySelector("#q"),
    grid: document.querySelector("#grid"),
    summary: document.querySelector("#summary"),
    pages: document.querySelector("#pagination"),
    sort: document.querySelector("#sort")
  };

  const esc = s => String(s).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[c]);

  function hi(s, q) {
    if (!q) return esc(s);
    const safe = esc(s);
    const needle = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(needle, "ig"), m => `<mark>${m}</mark>`);
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();

    let list = DATA.map(monster => {
      let drops = monster.drops;
      if (q) {
        const mobHit = monster.name.toLowerCase().includes(q);

        if (!mobHit) {
          drops = drops.filter(drop =>
            drop.name.toLowerCase().includes(q)
          );
        }
        if (!mobHit && !drops.length) return null;
      }
      if (state.filter !== "全部") {
        drops = drops.filter(drop => drop.category === state.filter);
      }

      if (!drops.length) return null;
      return { ...monster, drops };
    }).filter(Boolean);

    list.sort((a, b) => {
      if (state.sort === "drops") return b.drops.length - a.drops.length || a.name.localeCompare(b.name, "zh-Hant");
      if (state.sort === "id") return Number(a.id) - Number(b.id);
      return a.name.localeCompare(b.name, "zh-Hant");
    });

    return list;
  }

  function card(monster) {
    const q = state.q.trim();
    const drops = monster.drops.map(drop => {
      const quantity = drop.min === drop.max
        ? `${drop.min}`
        : `${drop.min}～${drop.max}`;

      return `
        <div class="drop">
          <div>
            <div class="item">${hi(drop.name, q)}<span class="badge">${esc(drop.category)}</span></div>
          </div>
          <div class="meta">
            <span class="qty">數量 ${quantity}</span>
          </div>
        </div>`;
    }).join("");

    return `
      <article class="card">
        <div class="card-head">
          <div>
            <div class="mob-name">${hi(monster.name, q)}</div>
            <div class="mob-id">NPC ID：${monster.id}</div>
          </div>
          <div class="drop-count">${monster.drops.length} 項掉落</div>
        </div>
        <div class="drops">${drops}</div>
      </article>`;
  }

  function renderPages(totalPages) {
    if (totalPages <= 1) {
      el.pages.innerHTML = "";
      return;
    }

    const pages = new Set([
      1, totalPages, state.page,
      state.page - 1, state.page + 1,
      state.page - 2, state.page + 2
    ]);
    const valid = [...pages]
      .filter(page => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);

    let html = `<button class="page-btn" data-page="${Math.max(1, state.page - 1)}">‹</button>`;
    let previous = 0;

    valid.forEach(page => {
      if (previous && page - previous > 1) html += `<span style="padding:9px 3px;color:#6f756f">…</span>`;
      html += `<button class="page-btn ${page === state.page ? "active" : ""}" data-page="${page}">${page}</button>`;
      previous = page;
    });

    html += `<button class="page-btn" data-page="${Math.min(totalPages, state.page + 1)}">›</button>`;
    el.pages.innerHTML = html;
  }

  function render() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / state.size));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.size;
    const rows = list.slice(start, start + state.size);

    el.summary.innerHTML = `找到 <strong>${list.length.toLocaleString("zh-TW")}</strong> 個怪物結果`;
    el.grid.innerHTML = rows.length
      ? rows.map(card).join("")
      : `<div class="empty">找不到符合條件的怪物或掉落物。</div>`;

    renderPages(totalPages);
  }

  async function loadData() {
    try {
      const response = await fetch("../data/monsters.json?v=2", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      DATA = await response.json();
      if (!Array.isArray(DATA)) throw new Error("怪物資料格式錯誤");
      render();
    } catch (error) {
      console.error(error);
      el.summary.textContent = "";
      el.grid.innerHTML = `<div class="empty">目前無法載入怪物掉落資料，請稍後重新整理。</div>`;
    }
  }

  el.q.addEventListener("input", () => {
    state.q = el.q.value;
    state.page = 1;
    render();
  });

  document.querySelector("#filters").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    state.filter = button.dataset.filter;
    state.page = 1;
    render();
  });

  el.sort.addEventListener("change", () => {
    state.sort = el.sort.value;
    state.page = 1;
    render();
  });

  el.pages.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    state.page = Number(button.dataset.page);
    render();
    window.scrollTo({ top: document.querySelector(".resultbar").offsetTop - 110, behavior: "smooth" });
  });

  const top = document.querySelector("#top");
  window.addEventListener("scroll", () => {
    top.style.display = window.scrollY > 600 ? "block" : "none";
  });
  top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  loadData();
})();
