# Quizaki

Quiz app (Expo / React Native + TypeScript). Runs in the **browser on localhost** by default — **no Expo Go required**.

## Run in the browser (default)

```bash
cd Quizaki
npm install
npm run dev
```

### `npm` is not recognized (PowerShell / Cursor)

Node is installed but this terminal has an **old PATH**. Try one of these:

1. **Restart Cursor** completely (quit the app, open again), then open a new terminal and run `npm run dev`.
2. From the Quizaki folder, double‑click **`dev.cmd`** or run:
   ```powershell
   .\dev.ps1
   ```
   These scripts refresh PATH and start `npm run dev`.
3. Or call npm by full path once:
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run dev
   ```
4. If Node is not installed: [https://nodejs.org/](https://nodejs.org/) (LTS), then restart Cursor.

This starts **Expo web** (Metro, port **8081**) και **BrowserSync** (port **3000**) με **file watcher**: όταν αλλάζει κώδικας ή assets, το tab ανανεώνεται. Άνοιξε **`http://localhost:3000`** (όχι το 8081 απευθείας). Για κλασικό Expo χωρίς sync: `npm run dev:plain` → συνήθως **`http://localhost:8081`**.

You do **not** need the Expo Go app for this workflow.

## Scripts

| Script | What it does |
|--------|----------------|
| `npm run dev` / `npm start` | **Web** + BrowserSync reload — άνοιξε **`http://localhost:3000`** |
| `npm run dev:web` | Ίδιο με `dev` |
| `npm run dev:plain` | Μόνο Expo web (χωρίς sync) — **`http://localhost:8081`** |
| `npm run dev:mobile` | Phone / QR code (`expo start --lan`) — only if you install **Expo Go** |
| `npm run dev:tunnel` | Same as mobile but via tunnel |
| `npm run import:questions` | Excel → `src/data/csvRaw.ts` (δες `data/README.txt`) |
| **`import-questions.cmd`** | Ίδια δουλειά **χωρίς** `npm.ps1` — διπλό κλικ ή `.\import-questions.cmd` στο PowerShell |

## Εισαγωγή ερωτήσεων από Excel

1. Βάλε το `.xlsx` στο **`src/data/`** ή **`data/`** (όνομα προεπιλογής: `Quizaki_2026.04.05.xlsx`) ή δώσε path ως όρισμα.
2. Η **πρώτη γραμμή** του πρώτου φύλλου = κεφαλίδες: `id`, `category`, `question`, `answer`, `type`, `difficulty`, `options`, `correct_option` (βλ. `data/README.txt`).
3. Τρέξε ένα από τα παρακάτω:

```powershell
.\import-questions.cmd
```

Αν το PowerShell μπλοκάρει το `npm` (`npm.ps1` / ExecutionPolicy), χρησιμοποίησε το `.cmd` παραπάνω ή:

```powershell
npm.cmd run import:questions
```

Με άλλο αρχείο:

```powershell
.\import-questions.cmd path\προς\άλλο.xlsx
```

## GitHub Pages (δημόσιο web build)

Το web export γράφει στο **`dist/`**. Για **Project Page** (`https://USER.github.io/REPO/`) το `app.json` έχει `experiments.baseUrl` ίσο με **`/quizaki`** — **άλλαξέ το** σε `/ΌΝΟΜΑ-REPO` αν το repository σου δεν λέγεται `quizaki`.

**Τοπικά build:**

```bash
npm run export:web
```

**Αυτόματο deploy:** push στο `main` (ή `master`) τρέχει το workflow που κάνει export και push στο branch **`gh-pages`**. Στο GitHub: **Settings → Pages → Build and deployment → Branch: `gh-pages` / folder `/ (root)`**.

Μετά το deploy: **`https://<username>.github.io/<repo>/`**

## Tests

```bash
npm test
```

## Project layout

- `src/game/` — game state, deck builder
- `src/data/` — CSV parsing, types
- `src/screens/` — UI flow

## Σημείωση (ελληνικά)

Η προεπιλογή είναι **web**. Για κινητό με Expo Go χρησιμοποίησε `npm run dev:mobile` (ίδιο Wi‑Fi ή `dev:tunnel`).

Οι ερωτήσεις **δεν ξαναμπαίνουν για 7 ημέρες** αφού εμφανιστούν σε deck (αποθήκευση **localStorage** / **AsyncStorage**). Αν δεν φτάνουν διαθέσιμες για νέο deck, γίνεται **μία** έκτακτη επαναφορά του cooldown (όπως πριν).
