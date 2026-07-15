(() => {
  const search = document.getElementById("bossSearch");
  const filter = document.getElementById("bossFilter");
  const lead = document.getElementById("nextBoss");
  const grid = document.getElementById("bossGrid");

  let bosses = [];

  const parseBoss = boss => ({
    ...boss,
    date: new Date(boss.spawnTime.replace(" ", "T"))
  });

  const formatCountdown = seconds => [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60
  ].map(value => String(value).padStart(2, "0")).join(":");

  const formatTime = date => date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  function render() {
    const now = new Date();
    const keyword = search.value.trim().toLowerCase();
    const state = filter.value;
    const parsed = bosses.map(parseBoss);

    const upcoming = parsed
      .filter(boss => boss.date > now)
      .sort((a, b) => a.date - b.date);

    const born = parsed.filter(boss => boss.date <= now);
    const next = upcoming[0];

    lead.innerHTML = next ? `
      <div class="eyebrow">下一隻即將出生</div>
      <div class="lead-name">${next.name}</div>
      <div class="lead-time">${formatCountdown(Math.max(0, Math.floor((next.date - now) / 1000)))}</div>
      <div class="status">預計時間 ${next.date.toLocaleString("zh-TW", { hour12: false })}</div>
    ` : `
      <div class="eyebrow">目前狀態</div>
      <div class="lead-name">${born.length} 隻 BOSS 已出生</div>
      <div class="status">等待玩家擊殺後更新下一次出生時間</div>
    `;

    const visible = parsed
      .filter(boss => boss.name.toLowerCase().includes(keyword))
      .filter(boss => {
        if (state === "born") return boss.date <= now;
        if (state === "future") return boss.date > now;
        return true;
      })
      .sort((a, b) => a.date - b.date);

    grid.innerHTML = visible.length ? visible.map(boss => {
      const isBorn = boss.date <= now;
      const remaining = Math.max(0, Math.floor((boss.date - now) / 1000));
      const isNext = next &&
        boss.name === next.name &&
        boss.spawnTime === next.spawnTime;

      const classes = [
        "panel",
        "card",
        isBorn ? "born" : "",
        isNext ? "next" : ""
      ].filter(Boolean).join(" ");

      const badge = isBorn
        ? "已出生・等待擊殺"
        : isNext
          ? `下一隻・${formatCountdown(remaining)}`
          : `倒數 ${formatCountdown(remaining)}`;

      return `
        <article class="${classes}">
          <div class="time">${formatTime(boss.date)}</div>
          <div class="name">${boss.name}</div>
          <span class="badge">${badge}</span>
        </article>
      `;
    }).join("") : `
      <div class="panel empty">找不到符合條件的 BOSS。</div>
    `;
  }

  async function loadBosses() {
    try {
      const response = await fetch("../data/bosses.json", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      bosses = await response.json();

      if (!Array.isArray(bosses)) {
        throw new Error("BOSS 資料格式錯誤");
      }

      render();
    } catch (error) {
      console.error(error);
      lead.innerHTML = `
        <div class="eyebrow">讀取失敗</div>
        <div class="lead-name">目前無法載入 BOSS 資料</div>
        <div class="status">請稍後重新整理頁面。</div>
      `;
      grid.innerHTML = "";
    }
  }

  search.addEventListener("input", render);
  filter.addEventListener("change", render);

  loadBosses();
  window.setInterval(render, 1000);
})();
