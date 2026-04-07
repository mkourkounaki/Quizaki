Βάλε το Excel π.χ. Quizaki_2026.04.05.xlsx στο src/data/ (ή εδώ στο data/).

Η πρώτη γραμμή (κεφαλίδες) πρέπει να είναι ακριβώς:
id, category, question, answer, type, difficulty, options, correct_option

Μετά από το root του project (χωρίς μπλοκάρισμα από PowerShell ExecutionPolicy):
  import-questions.cmd
ή:
  powershell -ExecutionPolicy Bypass -File import-questions.ps1
ή:
  npm.cmd run import:questions

Με άλλο path:
  import-questions.cmd C:\path\αρχείο.xlsx
