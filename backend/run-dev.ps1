$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Get-CompatiblePython {
  $candidates = @(
    @("py", "-3.13"),
    @("py", "-3.12"),
    @("py", "-3.11"),
    @("python", "")
  )

  foreach ($candidate in $candidates) {
    $cmd = $candidate[0]
    $arg = $candidate[1]

    try {
      if ($arg) {
        $version = & $cmd $arg -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
        $exe = & $cmd $arg -c "import sys; print(sys.executable)"
      } else {
        $version = & $cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
        $exe = & $cmd -c "import sys; print(sys.executable)"
      }

      if ($LASTEXITCODE -eq 0 -and $version) {
        $parts = $version.Trim().Split(".")
        $major = [int]$parts[0]
        $minor = [int]$parts[1]

        if ($major -eq 3 -and $minor -ge 11 -and $minor -le 13) {
          return @{ Command = $cmd; Arg = $arg; Version = $version.Trim(); Exe = $exe.Trim() }
        }

        Write-Host "Skipping Python $version because this backend currently supports Python 3.11 to 3.13." -ForegroundColor Yellow
      }
    } catch {
      # Try next candidate.
    }
  }

  throw @"
No compatible Python found.

Your error came from Python 3.14. pydantic-core currently failed to build against Python 3.14 in your environment.

Install Python 3.12 or 3.13, then rerun this script.

Recommended:
  winget install -e --id Python.Python.3.12

Then run:
  cd C:\Users\TheKwekuRO\Downloads\Infinity-ai\backend
  .\run-dev.ps1
"@
}

$py = Get-CompatiblePython
Write-Host "Using Python $($py.Version): $($py.Exe)" -ForegroundColor Green

if (Test-Path ".venv") {
  $venvVersion = $null
  try {
    $venvVersion = .\.venv\Scripts\python.exe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
  } catch {}

  if ($venvVersion -and $venvVersion.Trim() -eq $py.Version) {
    Write-Host "Reusing existing .venv with Python $venvVersion" -ForegroundColor Green
  } else {
    Write-Host "Removing incompatible .venv..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".venv"
  }
}

if (!(Test-Path ".venv")) {
  if ($py.Arg) {
    & $py.Command $py.Arg -m venv .venv
  } else {
    & $py.Command -m venv .venv
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create virtual environment."
  }
}

.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
  throw "Backend dependency installation failed."
}

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000