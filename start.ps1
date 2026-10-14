#Requires -Version 5.1
<#
  电商运营助手 · 一键启动脚本
  ------------------------------------------------------------------
  1) 校验 Docker 与 Compose        2) 准备 .env（占位密码自动换随机值）
  3) 构建并拉起全部服务            4) 等待 Web 就绪
  5) 自动打开登录页
#>

$ErrorActionPreference = "Continue"
# 抑制 Invoke-WebRequest 的进度条，避免刷屏把关键提示冲掉
$ProgressPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

function Write-Step([string]$Message) { Write-Host ("  >> " + $Message) -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host ("  OK " + $Message) -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host ("  !! " + $Message) -ForegroundColor Yellow }
function Write-Err([string]$Message) { Write-Host ("  XX " + $Message) -ForegroundColor Red }

Write-Host ""
Write-Host "  电商运营助手 · 一键启动" -ForegroundColor White
Write-Host "  ------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# ---------- 1. Docker 环境 ----------
Write-Step "检查 Docker 环境..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Err "未检测到 docker 命令，请先安装并启动 Docker Desktop。"
  exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Err "Docker 守护进程未运行，请先启动 Docker Desktop 后重试。"
  exit 1
}
Write-Ok "Docker 守护进程已就绪"

# ---------- 2. Compose ----------
$composeV2 = $true
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
  docker-compose version *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Err "未检测到 docker compose，请升级 Docker Desktop 或安装 docker-compose。"
    exit 1
  }
  $composeV2 = $false
  Write-Warn "使用旧版 docker-compose 命令"
}

# 注意：不要用自定义函数包装 compose 调用。
# PowerShell 会把 `-d` 当作函数参数名解析，导致参数丢失、`up` 退化成前台模式而永久挂起，
# 因此这里始终用显式 if/else 直接调用原生命令。

# ---------- 3. .env ----------
Write-Step "检查环境变量文件..."
$envPath = Join-Path $root ".env"
$envExamplePath = Join-Path $root ".env.example"
if (-not (Test-Path -LiteralPath $envPath)) {
  if (-not (Test-Path -LiteralPath $envExamplePath)) {
    Write-Err "缺少 .env 与 .env.example，无法启动服务。"
    exit 1
  }
  Copy-Item -LiteralPath $envExamplePath -Destination $envPath
  Write-Warn "未发现 .env，已从 .env.example 生成。"
}

function New-Secret([int]$Length) {
  $bytes = New-Object byte[] $Length
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  $value = [Convert]::ToBase64String($bytes)
  $value = $value.Replace("+", "-").Replace("/", "_").Replace("=", "")
  if ($value.Length -lt $Length) { return $value }
  return $value.Substring(0, $Length)
}

# 占位密码自动替换为随机密钥，保证开箱即可启动
$placeholders = @{
  "MYSQL_ROOT_PASSWORD"      = "replace_with_random_urlsafe_32_char_secret"
  "REDIS_PASSWORD"           = "replace_with_random_urlsafe_32_char_secret"
  "AGENT_POSTGRES_PASSWORD"  = "replace_with_random_32_char_secret"
  "AUTH_SECRET_KEY"          = "dev-auth-secret-change-me"
}
$envLines = @(Get-Content -LiteralPath $envPath)
$newLines = New-Object System.Collections.Generic.List[string]
$replaced = $false
foreach ($line in $envLines) {
  $handled = $false
  foreach ($key in $placeholders.Keys) {
    $pattern = "^\s*" + $key + "\s*=\s*" + [regex]::Escape($placeholders[$key]) + "\s*$"
    if ($line -match $pattern) {
      $newLines.Add($key + "=" + (New-Secret 32))
      $handled = $true
      $replaced = $true
      break
    }
  }
  if (-not $handled) { $newLines.Add($line) }
}
if ($replaced) {
  # 不带 BOM 写入，避免 docker compose 解析首行键值失败
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($envPath, $newLines, $utf8NoBom)
  Write-Warn "检测到 .env 中仍是占位密钥，已自动替换为随机值。"
}
Write-Ok "环境变量文件已就绪"

# 读取端口配置
$webPort = 3000
$apiPort = 8000
foreach ($line in @(Get-Content -LiteralPath $envPath)) {
  if ($line -match '^\s*WEB_PORT\s*=\s*(\d+)\s*$') { $webPort = [int]$Matches[1] }
  if ($line -match '^\s*API_PORT\s*=\s*(\d+)\s*$') { $apiPort = [int]$Matches[1] }
}

# ---------- 4. 构建并启动 ----------
Write-Step "构建并启动全部服务（首次运行需拉取镜像与构建，请耐心等待）..."
if ($composeV2) {
  docker compose up -d --build
}
else {
  docker-compose up -d --build
}
if ($LASTEXITCODE -ne 0) {
  Write-Err "docker compose 启动失败，请查看上方日志排查。"
  exit 1
}
Write-Ok "容器已启动"

# ---------- 5. 等待 Web 就绪 ----------
$loginUrl = "http://localhost:$webPort/login"
Write-Step "等待 Web 服务就绪（最长约 5 分钟）：$loginUrl"
$ready = $false
for ($i = 1; $i -le 100; $i++) {
  try {
    $response = Invoke-WebRequest -Uri $loginUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  }
  catch {
    # 服务尚未就绪，继续轮询
  }
  Start-Sleep -Seconds 3
}
if ($ready) {
  Write-Ok "Web 服务已就绪"
}
else {
  Write-Warn "等待超时，服务可能仍在启动中，可稍后手动访问。"
}

# ---------- 6. 打开浏览器 ----------
Write-Step "打开登录页..."
Start-Process $loginUrl

Write-Host ""
Write-Host "  服务地址" -ForegroundColor White
Write-Host "  ------------------------------------------" -ForegroundColor DarkGray
Write-Host ("  登录页     http://localhost:" + $webPort + "/login")
Write-Host ("  注册页     http://localhost:" + $webPort + "/register")
Write-Host ("  工作台     http://localhost:" + $webPort)
Write-Host ("  接口文档   http://localhost:" + $apiPort + "/docs")
Write-Host ""
Write-Host "  停止服务：双击 stop.bat" -ForegroundColor DarkGray
Write-Host ""
exit 0
