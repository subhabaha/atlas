# BUILD BRIEF — Atlas Copco AI Bootcamp Demo Gallery (task pages)

You are building **one reference demo web page per training task**. Each page shows attendees
*what the task is expected to deliver* — running and self-explanatory, not merely described.
The page must be **professional, visually appealing, self-contained (no CDN / no backend), and
theme-aware (light + dark)**.

## Non-negotiables
- Pure static HTML in `dayN/taskM.html`. Link assets with **relative paths**: `../assets/style.css`,
  `../assets/charts.js`, `../assets/app.js`.
- **No external resources** (no CDN, no Google Fonts, no fetch). Everything inline or from `../assets/`.
- All data is **generated in-browser** with the seeded RNG (`AC.rng(seed)`), or hard-coded illustrative
  values consistent with the task pack. Realistic and internally consistent — not placeholder lorem.
- Match the **exemplar** `day1/task1.html` exactly in structure, class usage, tone and polish. Read it first.
- End every page: `node smoke.js dayN/taskM.html` must report `[ok]` (0 console/page errors) and svg>=1.

## Page skeleton (copy from exemplar, adapt)
```
<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{Task title} · Day N Task M</title>
  <meta name="description" content="...">
  <link rel="stylesheet" href="../assets/style.css">
</head><body>
  <header class="topbar"> ... brand + nav (All demos / Next) + theme-toggle ... </header>
  <main class="wrap">
    <div class="page-head"> crumbs · tags (badges incl. MODULE tag-mods) · h1 · tagline </div>
    <section class="section"><h2>The scenario</h2> ... </section>
    <section class="section"><h2>What the attendees must build</h2> <ul class="checklist grid grid-2"> ... </section>
    <section class="section"><h2>The live {console/studio/bench/...}</h2>  ← THE STAR: interactive dashboard </section>
    <section class="section"><h2>The trap ...</h2> callouts (bad/warn) </section>
    <section class="section"><div class="lesson"> the lesson made undeniable </div>
        <div class="card">Defend your result — italic sample sentence with <b>numbers</b></div></section>
    <nav class="pagenav"> prev (All demos or prev task) · next task </nav>
    <p class="note-sim">All figures generated in-browser from a seeded simulator...</p>
  </main>
  <footer class="footer"> ... </footer>
  <script src="../assets/charts.js"></script>
  <script src="../assets/app.js"></script>
  <script> /* generate data + render charts; wire controls; AC.renderAll(render); AC.onThemeChange(render); */ </script>
</body></html>
```

## The dashboard is the point
Reproduce the **actual deliverable** the task asks for, with interactive controls where natural
(sliders, segmented toggles `.seg`, switches `.switch`). Prefer 3–6 charts + metric tiles + a table.
Use a **verdict banner** where the task ends in a verdict. Always include the specific numbers,
confidence intervals, costs and thresholds the task names.

## Component classes (in style.css) — use these, don't invent CSS
- Layout: `.wrap`, `.section`, `.grid .grid-2/-3/-4` (`.keep2` keeps 2-col on mobile), `.card`, `.card-pad-lg`
- Metric tile: `.metric` (+ `.accent-ok/-warn/-bad/-blue`, `.big`), inner `.label/.value(.sm)/.ci/.sub`
- Verdict: `.verdict .v-ok/-warn/-bad` with `.dot .d-ok/...`, `.vt` title, `.vs` sub
- Callout: `.callout` (+ `.warn/.bad/.ok`) with `.k` kicker
- Lesson panel: `.lesson` with `.k` + `<h3>`
- Badges: `.badge .b-ok/-warn/-bad/-info/-blue`; `.chip`; module tag uses `.badge .tag-mods`
- Table: wrap in `.table-wrap`, `<table class="data">`, `td.num` right-aligns mono, `.muted`
- Checklist: `<ul class="checklist">` (auto ✓)
- Controls: `.control-row`, `.control` + `<label>`, `.seg`>`button(.active)`, `.switch`>`input+.track`,
  `input[type=range]`, `select`; `.readout` for live values; `.dash-toolbar` header row
- KV list: `<dl class="kv"><dt>..<dd>..`
- Page nav: `.pagenav` > `<a><div class="pn (next)"><small>..<b>..</div></a>`

## charts.js API (window.AC) — dependency-free SVG, theme-aware
All take `(containerEl, opts)`. Colors accept CSS vars e.g. `"var(--ac-blue)"`, or use `AC.color(i)`.
Palette vars: `--c1..--c8`; status `--ok/--warn/--bad/--ac-blue/--ac-cyan`.

- `AC.line(el,{ h, w?, series:[{name,color?,points:[[x,y]...],dots?,dotR?,width?,dashed?,area?,fill?,fillOpacity?}],
     bands:[{points:[[x,lo,hi]...],color?,opacity?}], hlines:[{y,color,label,dashed?,width?}],
     vlines:[{x,color,label,dashed?}], vbands:[{x0,x1,color,label,opacity?}], markers:[{x,y,color,label?,shape?('x'|'diamond'|'circle'),r?}],
     xmin?,xmax?,ymin?,ymax?, xticks:[{v,label}], xlabel?, ylabel?, yfmt?, ydp?, yticks?, legend? })`
- `AC.bar(el,{ h, data:[{label,value,color?}], horizontal?, min?,max?, ticks?, dp?, vfmt?, valueLabels?, cumulative? })`
  grouped: `AC.bar(el,{ h, groups:{categories:[...], series:[{name,color,values:[...]}]}, ... })`
- `AC.scatter(el,{ h, points:[{x,y,r?,color?,opacity?}], xmin?,xmax?,ymin?,ymax?, xticks, xlabel, ylabel, yfmt })`
- `AC.heatmap(el,{ matrix:[[..]], rows:[...], cols:[...], cell?, lblL?, lblT?, fmt?, cellColor?(v,r,c,max), max?, xlabel? })`  (great for confusion / disagreement matrices)
- `AC.donut(el,{ segments:[{value,color}], total?, center?, centerSub?, size?, stroke?, round? })`
- `AC.spark(el,{ data:[...], color?, w?, h?, dotLast? })`
- Helpers: `AC.rng(seed)`→ fn()∈[0,1); `AC.gauss(rand)`→ N(0,1); `AC.fmt(v,dp)`; `AC.color(i)`; `AC.mix(a,b,t)`
- Render hooks: `AC.renderAll(fn)` runs fn on DOMready; `AC.onThemeChange(fn)` re-runs fn when theme toggles
  → put all your chart drawing in one `render()` and register it with BOTH so charts redraw on theme switch.
- Legends auto-render under line/grouped-bar charts unless `legend:false`. For custom legends, build a
  `<div class="legend"><span class="li"><span class="sw" style="background:VAR"></span>label</span>...</div>`.

## Tone
Concise, senior, matches the handbook voice. Use the exact scenario facts, datasets, costs and numbers
from the task text you are given. Every headline number that the handbook says needs an interval — show one.

## Prev/next map (use these hrefs)
d1t2: ←task1.html  →task3.html   | d1t3: ←task2 →task4 | d1t4: ←task3 →../day2/task1.html
d2t1: ←../day1/task4.html →task2 | d2t2: ←task1 →task3 | d2t3: ←task2 →task4 | d2t4: ←task3 →../day3/task1.html
d3t1: ←../day2/task4.html →task2 | d3t2: ←task1 →task3 | d3t3: ←task2 →task4 | d3t4: ←task3 →../day4/task1.html
d4t1: ←../day3/task4.html →task2 | d4t2: ←task1 →task3 | d4t3: ←task2 →task4 | d4t4: ←task3 →../day5/task1.html
d5t1: ←../day4/task4.html →task2 | d5t2: ←task1 →task3 | d5t3: ←task2 →task4 | d5t4: ←task3 →../index.html (capstone → back to gallery)
The topbar "Next" link and crumbs should match. Crumbs: `<a href="../index.html">Gallery</a> › Day N · {Day theme} › Task M`.
```
