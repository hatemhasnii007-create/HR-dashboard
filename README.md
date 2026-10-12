# HR Analytics Dashboard

Interactive web version of the Power BI report **krono.pbix** (Kromberg & Schubert HR Analytics).
Static site: no build step, no server, no external requests. Optimised for **iPad** (portrait and landscape), also works on desktop and phone.

## What's inside

| Section | Source visual in the .pbix |
|---|---|
| KPI cards: Headcount, Staff, Indirect, Direct, Total direct hires | Card visuals |
| Monthly hiring (stacked area by gender) | Stacked area chart |
| Employees by region / Turnover by region | Clustered bar charts |
| Employees by gender | Donut chart |
| Monthly turnover | Column chart |
| Employee generations (X / M / Z) | Pie chart |
| Employees by project / Turnover by project | Column + bar charts |
| Headcount by seniority | Clustered column chart |
| Filters: Year, Gender, Employee type, Project | Slicers |

All measures follow the original DAX logic (year-end headcount = hired on or before 31 Dec and not left by then).

## Data privacy

The `.pbix` contains one row per employee (names, birth dates, religion, badge numbers…).
**None of that is published.** `data/hr-data.js` only holds anonymous counts grouped by
gender, employee type, project, region, generation, seniority and hire/exit month.

## Deploy on GitHub Pages

1. Create a repository (e.g. `hr-dashboard`) and upload **all files of this folder** (keep the structure).
2. Go to **Settings → Pages**.
3. Source: **Deploy from a branch** → branch `main`, folder `/ (root)` → **Save**.
4. After about a minute the site is live at `https://<your-username>.github.io/hr-dashboard/`.

Command line version:

```bash
git init && git add . && git commit -m "HR dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/hr-dashboard.git
git push -u origin main
```

> Heads-up: GitHub Pages sites are public on free plans, even from a private repo. The data is aggregated, but check it is OK to share before publishing.

## Add to the iPad Home Screen

Open the site in Safari → **Share** → **Add to Home Screen**. It then opens full-screen like an app.

## Project structure

```
index.html
css/style.css
js/app.js              dashboard logic (filters + charts)
js/chart.umd.min.js    Chart.js 4.4.7 (bundled, works offline)
data/hr-data.js        anonymised aggregated data
assets/logo.png
.nojekyll
```

## Update the data

Re-export the aggregates from the updated .pbix and replace `data/hr-data.js`
(format: `window.HR_DATA = { cols: [...], rows: [[...], ...] }`).
