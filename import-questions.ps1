# Ίδιο με import-questions.cmd — Bypass ώστε να μην μπλοκάρει η ExecutionPolicy στο npm.ps1
Set-Location $PSScriptRoot
& node scripts/xlsx-to-csvRaw.mjs @args
