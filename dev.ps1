# Run Quizaki when npm is missing from PATH (refresh env like a new Windows session)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')
Set-Location $PSScriptRoot
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error 'npm not found. Install Node.js LTS from https://nodejs.org/ and restart Cursor.'
  exit 1
}
npm run dev
