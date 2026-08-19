/* ===========================================================================
   Shared app behaviour: theme toggle, reveal-on-scroll, chart redraw on theme
   change, small helpers. No external dependencies.
   =========================================================================== */
(function () {
  const KEY = "ac-demo-theme";
  const root = document.documentElement;

  function applyTheme(t) {
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else if (t === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    const btn = document.querySelector(".theme-toggle");
    if (btn) btn.textContent = current() === "dark" ? "☀" : "☾";
  }
  function current() {
    const explicit = root.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  // init from storage
  try { const saved = localStorage.getItem(KEY); if (saved) applyTheme(saved); } catch (e) {}

  window.toggleTheme = function () {
    const next = current() === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (e) {}
    applyTheme(next);
    // redraw all registered charts so palette re-reads CSS vars
    if (window.AC && AC._redrawHooks) AC._redrawHooks.forEach(fn => { try { fn(); } catch (e) {} });
  };

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(current());
    // reveal on scroll
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("reveal"); io.unobserve(e.target); } });
      }, { threshold: 0.08 });
      document.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));
    }
  });

  // format helpers available to pages
  window.eur = (n, d = 0) => "€" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  window.pct = (n, d = 1) => Number(n).toFixed(d) + "%";
})();
