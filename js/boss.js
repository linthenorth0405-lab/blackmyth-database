(() => {
  const bosses = Array.isArray(window.BOSS_DATA) ? window.BOSS_DATA : [];
  const search = document.getElementById("bossSearch");
  const filter = document.getElementById("bossFilter");
  const lead = document.getElementById("nextBoss");
  const grid = document.getElementById("bossGrid");

  const parseBoss = boss => ({...boss,date:new Date(boss.spawnTime.replace(" ","T"))});

  const formatCountdown = seconds => [
    Math.floor(seconds/3600),
    Math.floor((seconds%3600)/60),
    seconds%60
  ].map(value=>String(value).padStart(2,"0")).join(":");

  const formatTime = date => date.toLocaleTimeString("zh-TW",{
    hour:"2-digit",minute:"2-digit",hour12:false
  });

  function render(){
    const now=new Date();
    const keyword=search.value.trim().toLowerCase();
    const state=filter.value;
    const parsed=bosses.map(parseBoss);
    const upcoming=parsed.filter(b=>b.date>now).sort((a,b)=>a.date-b.date);
    const born=parsed.filter(b=>b.date<=now);
    const next=upcoming[0];

    lead.innerHTML=next ? `
      <div class="eyebrow">下一隻即將出生</div>
      <div class="lead-name">${next.name}</div>
      <div class="lead-time">${formatCountdown(Math.max(0,Math.floor((next.date-now)/1000)))}</div>
      <div class="status">預計時間 ${next.date.toLocaleString("zh-TW",{hour12:false})}</div>
    ` : `
      <div class="eyebrow">目前狀態</div>
      <div class="lead-name">${born.length} 隻 BOSS 已出生</div>
      <div class="status">等待玩家擊殺後更新下一次出生時間</div>
    `;

    const visible=parsed
      .filter(b=>b.name.toLowerCase().includes(keyword))
      .filter(b=>state==="born"?b.date<=now:state==="future"?b.date>now:true)
      .sort((a,b)=>a.date-b.date);

    grid.innerHTML=visible.length ? visible.map(boss=>{
      const isBorn=boss.date<=now;
      const remaining=Math.max(0,Math.floor((boss.date-now)/1000));
      const isNext=next&&boss.name===next.name&&boss.spawnTime===next.spawnTime;
      const classes=["panel","card",isBorn?"born":"",isNext?"next":""].filter(Boolean).join(" ");
      const badge=isBorn?"已出生・等待擊殺":isNext?`下一隻・${formatCountdown(remaining)}`:`倒數 ${formatCountdown(remaining)}`;
      return `<article class="${classes}">
        <div class="time">${formatTime(boss.date)}</div>
        <div class="name">${boss.name}</div>
        <span class="badge">${badge}</span>
      </article>`;
    }).join("") : `<div class="panel empty">找不到符合條件的 BOSS。</div>`;
  }

  search.addEventListener("input",render);
  filter.addEventListener("change",render);
  render();
  setInterval(render,1000);
})();
