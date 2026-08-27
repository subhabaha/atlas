/* ===========================================================================
   AC Charts — a tiny dependency-free SVG charting library.
   Theme-aware via CSS custom properties. No external libraries.
   Usage: AC.line(el, {series:[...], ...}); AC.bar(...); etc.
   Every render is self-contained SVG so it works offline on any static host.
   =========================================================================== */
(function (global) {
  const NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["--c1","--c2","--c3","--c4","--c5","--c6","--c7","--c8"];

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  function color(i) { return cssVar(PALETTE[i % PALETTE.length], "#0b4ea2"); }
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgRoot(container, w, h) {
    container.innerHTML = "";
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", preserveAspectRatio: "xMidYMid meet", class: "chart" }, container);
    svg.style.display = "block";
    svg.style.maxWidth = "100%";
    svg.style.overflow = "visible";
    return svg;
  }
  const fmt = (v, d = 2) => (v == null || isNaN(v)) ? "–" : Number(v).toFixed(d);
  function niceExtent(min, max, pad = 0.06) {
    if (min === max) { min -= 1; max += 1; }
    const r = max - min; return [min - r * pad, max + r * pad];
  }
  function makeScale(dmin, dmax, rmin, rmax) {
    const d = (dmax - dmin) || 1;
    return v => rmin + (v - dmin) / d * (rmax - rmin);
  }

  /* ---------------------------------------------------------------- axes */
  function drawAxes(svg, o, xs, ys, x0, x1, y0, y1) {
    // gridlines + y ticks
    const yticks = o.yticks || 5;
    for (let i = 0; i <= yticks; i++) {
      const t = o.ymin + (o.ymax - o.ymin) * i / yticks;
      const yy = ys(t);
      el("line", { x1: x0, y1: yy, x2: x1, y2: yy, class: "grid-line" }, svg);
      const lab = el("text", { x: x0 - 8, y: yy + 3, "text-anchor": "end", class: "tick-label" }, svg);
      lab.textContent = o.yfmt ? o.yfmt(t) : fmt(t, o.ydp ?? 2);
    }
    // x ticks
    if (o.xticks) {
      o.xticks.forEach(tk => {
        const xx = xs(tk.v);
        el("line", { x1: xx, y1: y1, x2: xx, y2: y1 + 5, class: "axis-line" }, svg);
        const lab = el("text", { x: xx, y: y1 + 18, "text-anchor": "middle", class: "tick-label" }, svg);
        lab.textContent = tk.label;
      });
    }
    el("line", { x1: x0, y1: y1, x2: x1, y2: y1, class: "axis-line" }, svg);
    el("line", { x1: x0, y1: y0, x2: x0, y2: y1, class: "axis-line" }, svg);
    if (o.xlabel) { const t = el("text", { x: (x0 + x1) / 2, y: y1 + 34, "text-anchor": "middle", class: "axis-label" }, svg); t.textContent = o.xlabel; }
    if (o.ylabel) { const t = el("text", { x: x0 - 40, y: (y0 + y1) / 2, "text-anchor": "middle", class: "axis-label", transform: `rotate(-90 ${x0 - 40} ${(y0 + y1) / 2})` }, svg); t.textContent = o.ylabel; }
  }

  /* ---------------------------------------------------------------- line */
  // series: [{name, color?, points:[[x,y],...], dashed?, width?, area?, fill?}]
  // bands:  [{points:[[x,lo,hi]], color?}]  markers:[{x,y,color,label?,shape?}]
  // hlines: [{y, color, label, dashed}]  vlines:[{x,color,label,dashed}]  vbands:[{x0,x1,color,label}]
  function line(container, o) {
    const w = o.w || 640, h = o.h || 320;
    const m = Object.assign({ l: 52, r: 18, t: 16, b: 42 }, o.margin || {});
    const svg = svgRoot(container, w, h);
    const x0 = m.l, x1 = w - m.r, y0 = m.t, y1 = h - m.b;

    let xmin = o.xmin, xmax = o.xmax, ymin = o.ymin, ymax = o.ymax;
    const allX = [], allY = [];
    (o.series || []).forEach(s => s.points.forEach(p => { allX.push(p[0]); allY.push(p[1]); }));
    (o.bands || []).forEach(s => s.points.forEach(p => { allX.push(p[0]); allY.push(p[1]); allY.push(p[2]); }));
    if (xmin == null) xmin = Math.min(...allX);
    if (xmax == null) xmax = Math.max(...allX);
    if (ymin == null || ymax == null) { const [a, b] = niceExtent(Math.min(...allY), Math.max(...allY)); if (ymin == null) ymin = a; if (ymax == null) ymax = b; }
    o.ymin = ymin; o.ymax = ymax;
    const xs = makeScale(xmin, xmax, x0, x1), ys = makeScale(ymin, ymax, y1, y0);

    // vbands (shaded x regions)
    (o.vbands || []).forEach(b => {
      el("rect", { x: xs(b.x0), y: y0, width: Math.max(1, xs(b.x1) - xs(b.x0)), height: y1 - y0,
        fill: b.color || cssVar("--warn", "#d98a00"), opacity: b.opacity ?? 0.10 }, svg);
      if (b.label) { const t = el("text", { x: (xs(b.x0) + xs(b.x1)) / 2, y: y0 + 12, "text-anchor": "middle", class: "series-label", fill: cssVar("--ink-3") }, svg); t.textContent = b.label; }
    });

    drawAxes(svg, o, xs, ys, x0, x1, y0, y1);

    // confidence bands
    (o.bands || []).forEach(b => {
      const up = b.points.map(p => `${xs(p[0])},${ys(p[2])}`);
      const dn = b.points.slice().reverse().map(p => `${xs(p[0])},${ys(p[1])}`);
      el("polygon", { points: up.concat(dn).join(" "), fill: b.color || color(0), opacity: b.opacity ?? 0.15, stroke: "none" }, svg);
    });

    // hlines
    (o.hlines || []).forEach(l => {
      el("line", { x1: x0, y1: ys(l.y), x2: x1, y2: ys(l.y), stroke: l.color || cssVar("--bad", "#d64545"),
        "stroke-width": l.width || 1.5, "stroke-dasharray": l.dashed === false ? "0" : "6 4", opacity: l.opacity ?? .9 }, svg);
      if (l.label) { const t = el("text", { x: x1 - 4, y: ys(l.y) - 5, "text-anchor": "end", class: "series-label", fill: l.color || cssVar("--bad") }, svg); t.textContent = l.label; }
    });
    // vlines
    (o.vlines || []).forEach(l => {
      el("line", { x1: xs(l.x), y1: y0, x2: xs(l.x), y2: y1, stroke: l.color || cssVar("--ink-3"),
        "stroke-width": l.width || 1.3, "stroke-dasharray": l.dashed === false ? "0" : "5 4", opacity: l.opacity ?? .8 }, svg);
      if (l.label) { const t = el("text", { x: xs(l.x) + 4, y: y0 + 12, "text-anchor": "start", class: "series-label", fill: l.color || cssVar("--ink-3") }, svg); t.textContent = l.label; }
    });

    // series
    (o.series || []).forEach((s, i) => {
      const c = s.color || color(i);
      const pts = s.points.map(p => `${xs(p[0])},${ys(p[1])}`).join(" ");
      if (s.area) {
        const base = ys(Math.max(ymin, 0));
        const poly = s.points.map(p => `${xs(p[0])},${ys(p[1])}`).join(" ");
        const first = xs(s.points[0][0]), last = xs(s.points[s.points.length - 1][0]);
        el("polygon", { points: `${first},${base} ${poly} ${last},${base}`, fill: s.fill || c, opacity: s.fillOpacity ?? .12, stroke: "none" }, svg);
      }
      el("polyline", { points: pts, fill: "none", stroke: c, "stroke-width": s.width || 2.2,
        "stroke-dasharray": s.dashed ? "6 4" : "0", "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      if (s.dots) s.points.forEach(p => el("circle", { cx: xs(p[0]), cy: ys(p[1]), r: s.dotR || 2.6, fill: c }, svg));
    });

    // markers
    (o.markers || []).forEach(mk => {
      const c = mk.color || cssVar("--bad", "#d64545");
      const cx = xs(mk.x), cy = ys(mk.y);
      if (mk.shape === "x") {
        el("path", { d: `M${cx-4},${cy-4} L${cx+4},${cy+4} M${cx-4},${cy+4} L${cx+4},${cy-4}`, stroke: c, "stroke-width": 2 }, svg);
      } else if (mk.shape === "diamond") {
        el("path", { d: `M${cx},${cy-5} L${cx+5},${cy} L${cx},${cy+5} L${cx-5},${cy} Z`, fill: c, stroke: cssVar("--surface"), "stroke-width": 1.2 }, svg);
      } else {
        el("circle", { cx, cy, r: mk.r || 4.5, fill: c, stroke: cssVar("--surface"), "stroke-width": 1.4 }, svg);
      }
      if (mk.label) { const t = el("text", { x: cx, y: cy - 9, "text-anchor": "middle", class: "series-label", fill: c }, svg); t.textContent = mk.label; }
    });

    if (o.legend !== false && o.series && o.series.length) legendFor(container, o.series.map((s, i) => ({ name: s.name, color: s.color || color(i), dashed: s.dashed })));
    return svg;
  }

  /* ---------------------------------------------------------------- bar */
  // o.data: [{label, value, color?}] OR groups: {categories:[...], series:[{name,color,values:[]}]}
  function bar(container, o) {
    const horizontal = o.horizontal;
    const w = o.w || 640, h = o.h || 320;
    const m = Object.assign({ l: horizontal ? 130 : 48, r: 18, t: 16, b: horizontal ? 34 : 54 }, o.margin || {});
    const svg = svgRoot(container, w, h);
    const x0 = m.l, x1 = w - m.r, y0 = m.t, y1 = h - m.b;

    if (o.groups) return groupedBar(svg, o, x0, x1, y0, y1);

    const data = o.data;
    let vmax = o.max != null ? o.max : Math.max(...data.map(d => d.value), 0);
    let vmin = o.min != null ? o.min : Math.min(0, ...data.map(d => d.value));
    if (horizontal) {
      const ys = makeScale(vmin, vmax, x0, x1);
      const bandH = (y1 - y0) / data.length;
      // gridlines
      const t = o.ticks || 5;
      for (let i = 0; i <= t; i++) { const val = vmin + (vmax - vmin) * i / t; const xx = ys(val); el("line", { x1: xx, y1: y0, x2: xx, y2: y1, class: "grid-line" }, svg); const lab = el("text", { x: xx, y: y1 + 16, "text-anchor": "middle", class: "tick-label" }, svg); lab.textContent = o.vfmt ? o.vfmt(val) : fmt(val, o.dp ?? 0); }
      data.forEach((d, i) => {
        const cy = y0 + i * bandH;
        const bh = bandH * .62;
        el("rect", { x: ys(Math.min(0, d.value)), y: cy + (bandH - bh) / 2, width: Math.abs(ys(d.value) - ys(0)), height: bh, rx: 4, fill: d.color || color(i) }, svg);
        const lab = el("text", { x: x0 - 8, y: cy + bandH / 2 + 3, "text-anchor": "end", class: "tick-label", "font-family": "var(--sans)" }, svg); lab.textContent = d.label;
        if (o.valueLabels !== false) { const vl = el("text", { x: ys(d.value) + (d.value >= 0 ? 5 : -5), y: cy + bandH / 2 + 3, "text-anchor": d.value >= 0 ? "start" : "end", class: "tick-label", fill: cssVar("--ink-2") }, svg); vl.textContent = o.vfmt ? o.vfmt(d.value) : fmt(d.value, o.dp ?? 0); }
      });
    } else {
      const ys = makeScale(vmin, vmax, y1, y0);
      const bandW = (x1 - x0) / data.length;
      const t = o.ticks || 5;
      for (let i = 0; i <= t; i++) { const val = vmin + (vmax - vmin) * i / t; const yy = ys(val); el("line", { x1: x0, y1: yy, x2: x1, y2: yy, class: "grid-line" }, svg); const lab = el("text", { x: x0 - 8, y: yy + 3, "text-anchor": "end", class: "tick-label" }, svg); lab.textContent = o.vfmt ? o.vfmt(val) : fmt(val, o.dp ?? 0); }
      el("line", { x1: x0, y1: ys(0), x2: x1, y2: ys(0), class: "axis-line" }, svg);
      data.forEach((d, i) => {
        const cx = x0 + i * bandW; const bw = bandW * .6;
        el("rect", { x: cx + (bandW - bw) / 2, y: ys(Math.max(0, d.value)), width: bw, height: Math.abs(ys(d.value) - ys(0)), rx: 4, fill: d.color || color(i) }, svg);
        const lab = el("text", { x: cx + bandW / 2, y: y1 + 16, "text-anchor": "middle", class: "tick-label", "font-family": "var(--sans)" }, svg);
        lab.textContent = d.label;
        if (o.valueLabels !== false) { const vl = el("text", { x: cx + bandW / 2, y: ys(Math.max(0, d.value)) - 5, "text-anchor": "middle", class: "tick-label", fill: cssVar("--ink-2") }, svg); vl.textContent = o.vfmt ? o.vfmt(d.value) : fmt(d.value, o.dp ?? 0); }
      });
    }
    if (o.cumulative) { // Pareto line overlay (vertical bars only)
      const ys2 = makeScale(0, 100, y1, y0);
      let acc = 0; const tot = o.data.reduce((a, d) => a + d.value, 0);
      const bandW = (x1 - x0) / data.length;
      const pts = data.map((d, i) => { acc += d.value; return `${x0 + i * bandW + bandW / 2},${ys2(acc / tot * 100)}`; }).join(" ");
      el("polyline", { points: pts, fill: "none", stroke: cssVar("--c3"), "stroke-width": 2, "stroke-dasharray": "4 3" }, svg);
      data.forEach((d, i) => { let a2 = data.slice(0, i + 1).reduce((s, x) => s + x.value, 0); el("circle", { cx: x0 + i * bandW + bandW / 2, cy: ys2(a2 / tot * 100), r: 3, fill: cssVar("--c3") }, svg); });
    }
    return svg;
  }

  function groupedBar(svg, o, x0, x1, y0, y1) {
    const cats = o.groups.categories, ser = o.groups.series;
    const vmax = o.max != null ? o.max : Math.max(...ser.flatMap(s => s.values), 0);
    const vmin = o.min != null ? o.min : Math.min(0, ...ser.flatMap(s => s.values));
    const ys = makeScale(vmin, vmax, y1, y0);
    const t = o.ticks || 5;
    for (let i = 0; i <= t; i++) { const val = vmin + (vmax - vmin) * i / t; const yy = ys(val); el("line", { x1: x0, y1: yy, x2: x1, y2: yy, class: "grid-line" }, svg); const lab = el("text", { x: x0 - 8, y: yy + 3, "text-anchor": "end", class: "tick-label" }, svg); lab.textContent = o.vfmt ? o.vfmt(val) : fmt(val, o.dp ?? 0); }
    el("line", { x1: x0, y1: ys(0), x2: x1, y2: ys(0), class: "axis-line" }, svg);
    const bandW = (x1 - x0) / cats.length;
    const gw = bandW * .74, sw = gw / ser.length;
    cats.forEach((cat, ci) => {
      const gx = x0 + ci * bandW + (bandW - gw) / 2;
      ser.forEach((s, si) => {
        const v = s.values[ci];
        el("rect", { x: gx + si * sw + sw * .1, y: ys(Math.max(0, v)), width: sw * .8, height: Math.abs(ys(v) - ys(0)), rx: 3, fill: s.color || color(si) }, svg);
      });
      const lab = el("text", { x: x0 + ci * bandW + bandW / 2, y: y1 + 16, "text-anchor": "middle", class: "tick-label", "font-family": "var(--sans)" }, svg);
      lab.textContent = cat;
    });
    legendFor(svg.parentNode, ser.map((s, i) => ({ name: s.name, color: s.color || color(i) })));
    return svg;
  }

  /* ---------------------------------------------------------------- scatter */
  function scatter(container, o) {
    const w = o.w || 560, h = o.h || 340;
    const m = Object.assign({ l: 52, r: 18, t: 16, b: 44 }, o.margin || {});
    const svg = svgRoot(container, w, h);
    const x0 = m.l, x1 = w - m.r, y0 = m.t, y1 = h - m.b;
    const allX = o.points.map(p => p.x), allY = o.points.map(p => p.y);
    let [xa, xb] = niceExtent(o.xmin ?? Math.min(...allX), o.xmax ?? Math.max(...allX));
    let ya = o.ymin, yb = o.ymax; if (ya == null || yb == null) { const e = niceExtent(Math.min(...allY), Math.max(...allY)); ya = ya ?? e[0]; yb = yb ?? e[1]; }
    o.ymin = ya; o.ymax = yb;
    const xs = makeScale(o.xmin ?? xa, o.xmax ?? xb, x0, x1), ys = makeScale(ya, yb, y1, y0);
    drawAxes(svg, o, xs, ys, x0, x1, y0, y1);
    o.points.forEach((p, i) => el("circle", { cx: xs(p.x), cy: ys(p.y), r: p.r || 4, fill: p.color || color(0), opacity: p.opacity ?? .8, stroke: cssVar("--surface"), "stroke-width": .8 }, svg));
    return svg;
  }

  /* ---------------------------------------------------------------- heatmap / matrix */
  // o.matrix: [[..],[..]] rows x cols; o.rows, o.cols labels; o.colorScale fn(v,max)
  function heatmap(container, o) {
    const rows = o.matrix.length, cols = o.matrix[0].length;
    const cell = o.cell || 54, lblL = o.lblL || 110, lblT = o.lblT || 34, padR = o.padR || 8, padB = o.padB || 8;
    const w = lblL + cols * cell + padR, h = lblT + rows * cell + padB;
    const svg = svgRoot(container, w, h);
    const max = o.max != null ? o.max : Math.max(...o.matrix.flat());
    const base = o.baseColor || cssVar("--ac-blue", "#0b4ea2");
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = o.matrix[r][c];
      const t = max > 0 ? v / max : 0;
      const cellColor = o.cellColor ? o.cellColor(v, r, c, max) : mix(cssVar("--surface-2"), base, Math.pow(t, .7));
      const x = lblL + c * cell, y = lblT + r * cell;
      el("rect", { x, y, width: cell - 2, height: cell - 2, rx: 5, fill: cellColor, stroke: cssVar("--border"), "stroke-width": .6 }, svg);
      const tx = el("text", { x: x + (cell - 2) / 2, y: y + (cell - 2) / 2 + 4, "text-anchor": "middle", "font-family": "var(--mono)", "font-size": "12px", "font-weight": "700", fill: t > .55 ? "#fff" : cssVar("--ink") }, svg);
      tx.textContent = o.fmt ? o.fmt(v) : v;
    }
    (o.cols || []).forEach((c, i) => { const t = el("text", { x: lblL + i * cell + (cell - 2) / 2, y: lblT - 10, "text-anchor": "middle", class: "tick-label", "font-family": "var(--sans)" }, svg); t.textContent = c; });
    (o.rows || []).forEach((r, i) => { const t = el("text", { x: lblL - 8, y: lblT + i * cell + (cell - 2) / 2 + 4, "text-anchor": "end", class: "tick-label", "font-family": "var(--sans)" }, svg); t.textContent = r; });
    if (o.xlabel) { const t = el("text", { x: lblL + cols * cell / 2, y: 12, "text-anchor": "middle", class: "axis-label" }, svg); t.textContent = o.xlabel; }
    return svg;
  }

  /* ---------------------------------------------------------------- donut / gauge */
  function donut(container, o) {
    const size = o.size || 160, sw = o.stroke || 16, r = size / 2 - sw / 2 - 2, cx = size / 2, cy = size / 2;
    const svg = svgRoot(container, size, size);
    const total = o.total != null ? o.total : (o.segments || []).reduce((a, s) => a + s.value, 0);
    let a0 = -Math.PI / 2;
    el("circle", { cx, cy, r, fill: "none", stroke: cssVar("--surface-3"), "stroke-width": sw }, svg);
    (o.segments || []).forEach((s, i) => {
      const frac = total > 0 ? s.value / total : 0; const a1 = a0 + frac * 2 * Math.PI;
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0), x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
      el("path", { d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`, fill: "none", stroke: s.color || color(i), "stroke-width": sw, "stroke-linecap": o.round ? "round" : "butt" }, svg);
      a0 = a1;
    });
    if (o.center) { const t = el("text", { x: cx, y: cy - 2, "text-anchor": "middle", "font-family": "var(--mono)", "font-size": (o.centerSize||"22px"), "font-weight": "800", fill: cssVar("--ink") }, svg); t.textContent = o.center; }
    if (o.centerSub) { const t = el("text", { x: cx, y: cy + 16, "text-anchor": "middle", class: "tick-label", "font-family": "var(--sans)" }, svg); t.textContent = o.centerSub; }
    return svg;
  }

  /* ---------------------------------------------------------------- sparkline */
  function spark(container, o) {
    const w = o.w || 120, h = o.h || 34;
    const svg = svgRoot(container, w, h);
    const ys = o.data, mn = Math.min(...ys), mx = Math.max(...ys);
    const sx = makeScale(0, ys.length - 1, 2, w - 2), sy = makeScale(mn, mx, h - 3, 3);
    const pts = ys.map((v, i) => `${sx(i)},${sy(v)}`).join(" ");
    el("polyline", { points: pts, fill: "none", stroke: o.color || cssVar("--ac-blue"), "stroke-width": 1.8, "stroke-linejoin": "round" }, svg);
    if (o.dotLast) el("circle", { cx: sx(ys.length - 1), cy: sy(ys[ys.length - 1]), r: 2.5, fill: o.color || cssVar("--ac-blue") }, svg);
    return svg;
  }

  /* ---------------------------------------------------------------- helpers */
  function legendFor(container, items) {
    const box = container.parentNode && container.parentNode.querySelector(".legend");
    const target = document.createElement("div");
    target.className = "legend";
    items.forEach(it => {
      const li = document.createElement("span"); li.className = "li";
      const sw = document.createElement("span"); sw.className = "sw"; sw.style.background = it.color;
      if (it.dashed) sw.style.background = `repeating-linear-gradient(90deg, ${it.color} 0 5px, transparent 5px 9px)`;
      li.appendChild(sw);
      const tx = document.createElement("span"); tx.textContent = it.name; li.appendChild(tx);
      target.appendChild(li);
    });
    // append after the svg container
    if (container.nextSibling && container.nextSibling.classList && container.nextSibling.classList.contains("legend")) container.nextSibling.remove();
    container.parentNode.insertBefore(target, container.nextSibling);
  }
  function mix(a, b, t) {
    const pa = parse(a), pb = parse(b); if (!pa || !pb) return b;
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function parse(s) {
    s = (s || "").trim();
    if (s.startsWith("#")) { const n = s.slice(1); const f = n.length === 3 ? n.split("").map(c => c + c).join("") : n; return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]; }
    const m = s.match(/rg?ba?\(([^)]+)\)/); if (m) { return m[1].split(",").slice(0, 3).map(x => parseFloat(x)); }
    return null;
  }

  // seeded PRNG for reproducible synthetic data
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function gauss(rand) { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  const AC = { line, bar, scatter, heatmap, donut, spark, color, cssVar, rng, gauss, fmt, mix,
    renderAll(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); },
    _redrawHooks: [],
    onThemeChange(fn) { this._redrawHooks.push(fn); }
  };
  global.AC = AC;
})(window);
