param(
    [string]$AppName = "IronEdgeApp",
    [string]$Vendor = "IronEdge",
    [string]$Description = "Controle financeiro IronEdge para Windows",
    [string]$LauncherMain = "com.ironedge.DesktopAppLauncher"
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Comando '$Name' nao encontrado no PATH."
    }
}

Write-Host "==> Validando pre-requisitos..."
Assert-Command "mvn"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "==> Configurando WiX local (se existir)..."
$localWixDir = Join-Path $repoRoot ".tools/wix"
if ((Test-Path (Join-Path $localWixDir "candle.exe")) -and (Test-Path (Join-Path $localWixDir "light.exe"))) {
    $env:PATH = "$localWixDir;$env:PATH"
    Write-Host "Usando WiX local em: $localWixDir"
}

Assert-Command "jpackage"
Assert-Command "candle"
Assert-Command "light"

Write-Host "==> Lendo versao do pom.xml..."
[xml]$pom = Get-Content (Join-Path $repoRoot "pom.xml")
$version = $pom.project.version
if (-not $version) {
    throw "Nao foi possivel identificar a versao do projeto no pom.xml."
}

Write-Host "==> Build Maven (clean package, sem testes)..."
mvn -DskipTests clean package
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao compilar o projeto com Maven."
}

$targetDir = Join-Path $repoRoot "target"
$distDir = Join-Path $repoRoot "dist"

Write-Host "==> Localizando JAR empacotavel..."
$jar = Get-ChildItem $targetDir -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*.original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $jar) {
    throw "Nenhum JAR valido encontrado em '$targetDir'."
}

if (-not (Test-Path $distDir)) {
    New-Item -Path $distDir -ItemType Directory | Out-Null
}

Write-Host "==> Gerando instalador .exe com jpackage..."
jpackage `
  --type exe `
  --name $AppName `
  --app-version $version `
  --vendor $Vendor `
  --description $Description `
  --input $targetDir `
  --main-jar $jar.Name `
  --main-class org.springframework.boot.loader.launch.PropertiesLauncher `
  --java-options "-Dloader.main=$LauncherMain" `
  --dest $distDir `
  --win-dir-chooser `
  --win-shortcut `
  --win-menu `
  --win-per-user-install

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao gerar instalador com jpackage."
}

$installer = Get-ChildItem $distDir -Filter "$AppName-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($installer) {
    Write-Host ""
    Write-Host "Instalador gerado com sucesso:"
    Write-Host $installer.FullName
} else {
    Write-Host "Build finalizado, mas nao encontrei o instalador no diretorio dist."
}
