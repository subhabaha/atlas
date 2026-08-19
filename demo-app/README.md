# Atlas Copco · Advanced AI Engineering Bootcamp — Reference Demo Gallery

A professional, self-contained web application that showcases **what each hands-on task in the
five-day bootcamp is expected to deliver**. One interactive reference demo per task, navigable from
a common landing page — built to be projected during the programme so attendees can see, not just
hear, the expectation for every build.

- **5 days × 4 tasks = 20 reference demos**, plus a hub and an about page.
- **Pure static site** — HTML + CSS + a tiny dependency-free SVG charting library. No backend, no
  build step, no external CDN. Runs offline on any web server (or even `file://`).
- **Light + dark**, responsive, and reproducible: every chart is generated in-browser from a seeded
  simulator or from the public datasets the task packs reference.

## Structure

```
demo-app/
├── index.html            # hub — common landing page, all 20 tasks
├── about.html            # how to use the gallery
├── assets/
│   ├── style.css         # design system (light + dark)
│   ├── charts.js         # dependency-free SVG charts (AC.line/bar/scatter/heatmap/donut/spark)
│   └── app.js            # theme toggle, reveal, redraw-on-theme
├── day1/ … day5/
│   └── task1.html … task4.html      # one demo per task
├── deploy.sh             # one-command deploy to the server (rsync/scp + nginx)
├── smoke.js              # headless render check (playwright-core)
└── README.md
```

Each task page follows the same honest structure: **the scenario → what you must build →
the live dashboard → the trap it exposes → the lesson → the sentence you defend.**

### The 20 demos

| Day | Task 1 | Task 2 | Task 3 | Task 4 |
|-----|--------|--------|--------|--------|
| **1 · Accuracy Engineering** | SPC & Automatic Feedback Console | Failure-Prediction Operating-Point Studio | Failure Taxonomy & Hypothesis Backlog | Production Readiness Review |
| **2 · Architecture, Data & Security** | Pattern Selection Bench | The Nineteen Layers | Ingestion Architecture | Secure Retrieval, Three Roles |
| **3 · RAG, MCP & Observability** | The Ingestion Bench | Retrieval Strategy Benchmark | Three MCP Servers | Fix a Weak Pipeline, and Watch It |
| **4 · Vision, MLOps & Feedback** | Why Does the Model Fail? | Error Analysis & Three Hypotheses | The MLOps Pipeline, Built | The Feedback Loop, With Arithmetic |
| **5 · Agents, Skills & Guardrails** | The Field-Service Agent System | One Reusable Skill | Attack Your Own System, Then Defend It | The Capstone |

## Deploy to the server

Run from a machine that has SSH access to the target host:

```bash
./deploy.sh                             # defaults to root@103.216.171.67 → /var/www/atlas-demo
./deploy.sh azureuser@103.216.171.67    # different SSH user
./deploy.sh ubuntu@HOST /srv/www/demo   # different host / path
```

The script copies the site (rsync, or scp/tar fallback), installs & configures nginx to serve it on
port 80, and prints the URLs. After it runs:

- Common landing page: **`http://103.216.171.67/`**
- Each task has its own link, e.g. `http://103.216.171.67/day1/task1.html`,
  `http://103.216.171.67/day3/task2.html`, `http://103.216.171.67/day5/task4.html`.

**No SSH?** The site is just static files — copy `demo-app/` to the server's web root by any means and
point any web server at it. Fallbacks are documented at the bottom of `deploy.sh` (Python, Caddy, Docker).

## Develop / verify locally

```bash
cd demo-app
python3 -m http.server 8080      # then open http://localhost:8080/
```

Smoke-test that every page renders with no console errors (uses the pre-installed Chromium):

```bash
npm install playwright-core
node smoke.js index.html day1/task1.html day2/task1.html   # …or any set of pages
```

## Data & attribution

All data is **public, synthetic or illustrative**. No Atlas Copco production data is used. Cost figures
are the illustrative placeholders from the task packs. Public datasets referenced by the demos:
AI4I 2020 Predictive Maintenance, MetroPT-3, MaintIE, the US DOE Fundamentals Handbooks, and the
Özgenel surface-crack image set.
