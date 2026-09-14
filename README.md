# Rail ETA Intelligence Dashboard

Rail ETA Intelligence Dashboard is a static HTML, CSS, and JavaScript operations dashboard for train schedule monitoring, predicted delay intelligence, and live ETA estimation across stations.

## Project Description

This dashboard helps railway operations teams and passengers understand train movement across a route. It uses station schedule data, delay signals, and historical journey records to compute estimated arrival times and summarize route health in a clear operations-dashboard experience.

## Features

- Train route and station selector for exploring a route.
- Station-by-station schedule, predicted delay, ETA, and status visibility.
- Calculated ETA derived from scheduled arrival time plus predicted delay minutes.
- Historical delay and schedule data loaded from CSV files.
- Dark modern operations dashboard interface for a professional monitoring experience.
- GitHub Pages compatible static hosting for easy publishing.

## Local Launch

```bash
python -m http.server 8000
```

Then open <http://127.0.0.1:8000/index.html>.

## GitHub Pages

Because this project is a static HTML, CSS, and JavaScript site, it can be hosted directly on GitHub Pages. Enable GitHub Pages in the GitHub repository settings and choose the root branch or the repository root as the publishing source.

A workflow file in `.github/workflows/deploy-pages.yml` is included for automated static deployment through GitHub Actions.

## Dataset Inputs

The dashboard reads the schedule file `train_schedule_with_arrival_times (1).csv` and the combined delay/journey data file `fffgfggcccgcg_combined.csv`.

## Project Purpose

The dashboard is designed to support ETA prediction, delay visibility, and station-level route intelligence for rail operations monitoring.
