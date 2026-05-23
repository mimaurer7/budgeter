# Budgeter

A free, private personal budgeting desktop app. All data stays on your machine — no subscriptions, no accounts, no cloud.

Built with **Electron + React + TypeScript + Vite**.

## Features

- **Track income & expenses** — log transactions with date, category, amount, and notes
- **Monthly budget goals** — set spending limits per category and visualize progress
- **Charts & visualizations** — spending breakdown pie chart, budget vs actual bar chart, 6-month income/expense trend
- **Import bank CSVs** — upload exports from your bank with auto column detection
- **Local JSON storage** — data saved to your OS user data folder, fully private

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

### Build (Windows installer)

```bash
npm run package
```

Output is in the `dist/` folder as an NSIS installer.

## Project Structure

```
src/
  main/           Electron main process (file I/O, IPC handlers)
  preload/        Preload script (exposes safe APIs to renderer)
  renderer/
    src/
      components/ Shared UI components (Sidebar)
      pages/      Dashboard, Transactions, Budget, Charts, Import
      store/      useAppStore hook — data load/save/mutations
      types/      TypeScript types (Transaction, BudgetGoal, Category)
      utils/      Helpers (formatCurrency, parseCSV, generateId)
```

## Data Storage

App data is saved automatically to a JSON file in your OS user data directory:

- **Windows:** `%APPDATA%\budgeter\budgeter-data.json`
- **macOS:** `~/Library/Application Support/budgeter/budgeter-data.json`

## Tech Stack

| Tool | Purpose |
|------|---------|
| Electron | Desktop app shell |
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite + electron-vite | Fast dev/build tooling |
| Tailwind CSS | Styling |
| Recharts | Charts |
| electron-builder | Packaging/installer |

## License

MIT
