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

Run from a machine that has SSH access to the host (e.g. the Mac holding the SSH key / `~/.ssh/config`
alias). All internal links are **relative**, so the site works served from a subpath or a docroot.

```bash
./deploy.sh ragsys                      # copy via your ~/.ssh/config alias (non-destructive)
./deploy.sh root@103.216.171.67         # or an explicit user@host
```

By **default the script is non-destructive**: it only copies the files, then prints the exact nginx
`location` snippet to serve them at **`/atlas-demo/`** under your *existing* site — leaving your current
vhost and TLS untouched. To let it wire nginx for you, pass a mode:

```bash
FLAG=--location   ./deploy.sh ragsys    # adds /atlas-demo/ to your default server block + reloads
FLAG=--standalone ./deploy.sh ragsys    # dedicated vhost that owns port 80 (fresh server only)
```

After deploy (subpath mode):

- Common landing page: **`https://103.216.171.67/atlas-demo/`**
- Each task has its own link, e.g. `…/atlas-demo/day1/task1.html`, `…/atlas-demo/day3/task2.html`,
  `…/atlas-demo/day5/task4.html`.

**No SSH from your machine?** The site is just static files — copy `demo-app/` to the server's web root
by any means. Fallbacks (Python / Caddy / Docker) are documented at the bottom of `deploy.sh`.

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
