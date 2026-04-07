/**
 * BrowserSync: proxy στο Metro (Expo web) + αυτόματο reload όταν αλλάζουν αρχεία (chokidar).
 * Άνοιξε http://localhost:3000 — όχι απευθείας το 8081 — ώστε να δουλεύει το sync.
 * Αν το Metro δεν είναι στο 8081, άλλαξε και το proxy και το wait-on στο package.json.
 */
module.exports = {
  proxy: 'http://127.0.0.1:8081',
  files: ['App.tsx', 'app.json', 'babel.config.js', 'src/**/*', 'assets/**/*'],
  port: 3000,
  open: false,
  notify: false,
  reloadDebounce: 200,
};
