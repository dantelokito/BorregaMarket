# Bootstrap local LaBorregaMarket — puerto 8080 (Windows / PowerShell)
# Versión 0.12.0 — aplica todas las migraciones pendientes vía migrate deploy

$ErrorActionPreference = "Stop"
$Port = 8080
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Stop-NodeOnPort([int]$ListenPort) {
    $conns = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "Puerto $ListenPort libre."
        return
    }
    $pids = $conns.OwningProcess | Sort-Object -Unique
    foreach ($procId in $pids) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc -and ($proc.ProcessName -match 'node|next')) {
            Write-Host "Deteniendo $($proc.ProcessName) PID $procId"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host "Puerto $ListenPort usado por proceso no-Node: $($proc.ProcessName) PID $procId (omitido)" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
}

function Invoke-NpmInstall {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install falló con código $LASTEXITCODE"
    }
}

function Ensure-PrismaGenerate {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        throw "prisma generate falló con código $LASTEXITCODE"
    }
}

# 1. Liberar puerto 8080
Write-Step "1/8 Liberando puerto $Port"
Stop-NodeOnPort $Port

# 2. npm install (+ fallback approve-scripts)
Write-Step "2/8 npm install"
try {
    Invoke-NpmInstall
} catch {
    Write-Host "npm install falló; intentando approve-scripts..." -ForegroundColor Yellow
    npm approve-scripts --allow-scripts-pending
    if ($LASTEXITCODE -ne 0) {
        throw "npm approve-scripts falló con código $LASTEXITCODE"
    }
    Invoke-NpmInstall
}

# 3. Confirmar que no hay next dev (DLL Prisma)
Write-Step "3/8 Verificando que no haya next dev activo"
Stop-NodeOnPort $Port

# 4. prisma generate
Write-Step "4/8 prisma generate"
Ensure-PrismaGenerate

# 5. prisma migrate deploy
Write-Step "5/8 prisma migrate deploy"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    throw "prisma migrate deploy falló con código $LASTEXITCODE"
}

# 6. seed si faltan datos demo
Write-Step "6/8 Verificando datos demo (seed)"
$needsSeed = $false
$userCount = 0
try {
    $countOutput = npx tsx scripts/check-user-count.ts 2>&1
    if ($LASTEXITCODE -ne 0) {
        $needsSeed = $true
    } else {
        $match = [regex]::Match($countOutput, 'USER_COUNT=(\d+)')
        if ($match.Success) { $userCount = [int]$match.Groups[1].Value }
        if ($userCount -eq 0) { $needsSeed = $true }
    }
} catch {
    $needsSeed = $true
}

if ($needsSeed) {
    Write-Host "Ejecutando npm run db:seed..."
    npm run db:seed
    if ($LASTEXITCODE -ne 0) {
        throw "db:seed falló con código $LASTEXITCODE"
    }
} else {
    Write-Host "BD con usuarios ($userCount); seed omitido."
}

# 7. Levantar dev:lan en background
Write-Step "7/8 Iniciando npm run dev:lan"
$devJob = Start-Job -ScriptBlock {
    Set-Location $using:Root
    npm run dev:lan 2>&1
}

# Esperar a que el servidor esté listo
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}
if (-not $ready) {
    Receive-Job $devJob
    throw "El servidor no respondió en http://localhost:$Port tras 60s"
}

# 8. Health checks
Write-Step "8/8 Verificando salud"
$homeRes = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 10
$sessionRes = Invoke-WebRequest -Uri "http://localhost:$Port/api/auth/session" -UseBasicParsing -TimeoutSec 10

Write-Host ""
Write-Host "Bootstrap completado." -ForegroundColor Green
Write-Host "  Local:   http://localhost:$Port"
Write-Host "  LAN:     http://0.0.0.0:$Port"
Write-Host "  GET /:              $($homeRes.StatusCode)"
Write-Host "  GET /api/auth/session: $($sessionRes.StatusCode)"
Write-Host ""
Write-Host "Servidor corriendo en background (Job Id: $($devJob.Id)). Para ver logs: Receive-Job $($devJob.Id)"
