param(
    [int]$Port = 3000,
    [string]$Model = "llama3.2:1b",
    [switch]$SkipOllama,
    [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$UiRoot = Join-Path $ProjectRoot "ui"
$OllamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Port($PortNumber) {
    return [bool](Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction SilentlyContinue)
}

Write-Step "Verificando herramientas"
if (-not (Test-Command "python")) {
    throw "Python no está disponible en PATH."
}
if (-not (Test-Command "npm")) {
    throw "npm no está disponible en PATH."
}

if (-not $SkipOllama) {
    Write-Step "Verificando Ollama"
    if (-not (Test-Path $OllamaExe)) {
        throw "No encontré Ollama en $OllamaExe. Instálalo antes de usar IA local."
    }

    $ollamaReady = $false
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 | Out-Null
        $ollamaReady = $true
    } catch {
        $ollamaReady = $false
    }

    if (-not $ollamaReady) {
        Write-Step "Levantando Ollama"
        Start-Process -FilePath $OllamaExe -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 8
    }

    try {
        $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 10
    } catch {
        Write-Warning "Ollama no respondió. Brújula puede funcionar en modo resiliente sin IA local."
        $models = $null
    }

    if ($models) {
        $installed = @($models.models | ForEach-Object { $_.name })
        if ($installed -notcontains $Model) {
            Write-Warning "El modelo $Model no está instalado. Instálalo con: ollama pull $Model"
            Write-Warning "La app seguirá funcionando con fallback si Ollama no puede generar respuesta."
        } else {
            Write-Host "Ollama listo con modelo $Model" -ForegroundColor Green
        }
    }
}

Write-Step "Verificando dependencias del frontend"
if (-not (Test-Path (Join-Path $UiRoot "node_modules")) -and -not $NoInstall) {
    Push-Location $UiRoot
    try {
        npm install
    } finally {
        Pop-Location
    }
}

if (Test-Port $Port) {
    throw "El puerto $Port ya está en uso. Prueba: .\start_local.ps1 -Port 3001"
}

Write-Step "Levantando Brújula UI"
Write-Host "URL: http://localhost:$Port" -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor DarkGray

Push-Location $UiRoot
try {
    npm run dev -- --port $Port
} finally {
    Pop-Location
}
