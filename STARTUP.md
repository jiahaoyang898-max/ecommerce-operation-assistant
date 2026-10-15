# 电商运营助手 · 怎么启动（实操版）

> 项目路径：`D:\ruanjian\ecommerce-operation-assistant`
> 本文件只讲一件事：**怎么把整套服务跑起来**。想了解架构、端口、日志等细节请看 `RUN.md`。

---

## 〇、先记住三件事

1. **打开项目文件夹** `D:\ruanjian\ecommerce-operation-assistant`
2. **保证 Docker Desktop 已启动**（任务栏右下角图标变成稳定绿色）
3. **双击 `start.bat`** → 等出现 `OK Web 服务已就绪` → 浏览器自动打开登录页

就这三步。下面是详细版。

---

## 〇·五、本机实跑差异（2026-10-15 实测记录）

| 项 | 本机实际值 | 原因与说明 |
|---|---|---|
| 后端 API 端口 | **8002**（非 8000） | 8000 被 `das-backend` 容器占用。改 `.env` 的 `API_PORT` 即可，`docker-compose.yml` 里前端构建参数 `NEXT_PUBLIC_API_BASE_URL` 会自动跟随 |
| MySQL 宿主端口 | **3308**（非 3306） | 3306 被 `cs-mysql` 容器占用。容器内部仍是 3306，仅宿主机映射改变，业务代码无影响 |
| 演示账号 | `demo@example.com` / `Passw0rd123` | 角色 operator。登录页有 **「一键填入演示账号」** 按钮，点一下自动填好邮箱与密码 |
| 基础镜像 | 已预置在本地 | 本机三个 Docker Hub 加速源（`1ms.run` / `xuanyuan.me` / `daocloud`）全部不可用且首源失败不回退。`start.ps1` 已内置自检：缺镜像时自动从 `swr.cn-north-4.myhuaweicloud.com` 与 `ghcr.nju.edu.cn` 补拉并 retag 回标准名 |
| npm 源 | `registry.npmmirror.com` | 官方源 `registry.npmjs.org` 在本机装包持续 `ECONNRESET`，已写入 `web/Dockerfile` 两处 `npm ci` |
| 双击 `start.bat` | 可用且更快 | 脚本已改为：应用镜像已存在 → 只 `up -d`（秒级启动）；缺镜像 → 自动 `--build` |
| 即梦图片 / 视频 | **均不可用** | 火山引擎账号余额不足，供应商返回 `code 50400 Access Denied`。充值或开通能力后**无需改代码**即恢复；文本大模型通道正常（`/settings` 测试 text 返回 200） |

---

## 一、启动前的唯一前提：Docker Desktop

本项目 6 个服务全部跑在 Docker 里，**必须先有 Docker 引擎**。

| 检查 | 怎么做 |
|---|---|
| 是否已安装 | 开始菜单搜索 "Docker Desktop" 能找到即已安装 |
| 是否已运行 | 看任务栏右下角有没有 🐳 鲸鱼图标 |

**如果没运行**：双击开始菜单里的 Docker Desktop，等 **30~60 秒**，右下角托盘图标变绿（没有红色感叹号）再继续。

> 电脑开机后第一次启动 Docker Desktop 会慢一些，属正常。

---

## 二、启动方式（三选一）

### 方式 A：双击启动（最省事，推荐）

1. 打开文件夹 `D:\ruanjian\ecommerce-operation-assistant`
2. 找到 **`start.bat`**，**双击**
3. 弹出的黑窗口里开始自动跑流程，会打印一行行进度
4. 看到 **`OK Web 服务已就绪`** 就是成功了
5. 浏览器**自动打开**登录页
6. 最后窗口显示「请按任意键继续」，按一下回车关掉即可

> ⚠️ 这个黑窗口**在跑完之前不要关**，也不要按 Ctrl+C。跑完后再关。

### 方式 B：终端一条命令

打开 **PowerShell**（开始菜单搜 "PowerShell"），粘贴下面这行，回车：

```powershell
cd D:\ruanjian\ecommerce-operation-assistant; .\start.ps1
```

打开 **CMD** 的话用这条：

```cmd
cd /d D:\ruanjian\ecommerce-operation-assistant && start.bat
```

### 方式 C：日常重启最快（只推荐没改代码时用）

电脑关机后再次开机，如果**没有改过任何代码**，用这条几秒就能起来（不用重新构建）：

```powershell
cd D:\ruanjian\ecommerce-operation-assistant; docker compose up -d
```

---

## 三、怎么算启动成功

看到下面三条就算成了：

| 检查 | 期望 |
|---|---|
| 命令行最后两行 | `OK Web 服务已就绪` + 打印出一串访问地址 |
| 浏览器 | 自动弹出登录页，能看到页面内容 |
| 容器状态 | 6 个服务全部 `Up`（mysql / redis / agent-checkpoints 显示 healthy） |

容器状态随时可以这样查：

```powershell
cd D:\ruanjian\ecommerce-operation-assistant; docker compose ps
```

---

## 四、启动后访问什么

| 页面 | 地址 | 说明 |
|---|---|---|
| **登录页** | http://localhost:3000/login | 从这里进入系统 |
| 注册页 | http://localhost:3000/register | 没有账号先注册 |
| 工作台 | http://localhost:3000 | 登录后的首页 |
| 接口文档 | http://localhost:8000/docs | 后端 Swagger 文档 |
| 健康检查 | http://localhost:8000/health | 返回正常即后端活着 |

---

## 五、怎么停止

### 方式 A：双击停止

打开 `D:\ruanjian\ecommerce-operation-assistant`，双击 **`stop.bat`**。

### 方式 B：命令停止

```powershell
cd D:\ruanjian\ecommerce-operation-assistant; docker compose down
```

> ✅ 停止**不会丢数据**。所有业务数据存在 Docker 数据卷里，下次启动原样还在。
> ⚠️ 千万不要用 `docker compose down -v`（带 `-v`）——那个会连数据卷一起删掉，数据全部清空。

---

## 六、什么时候必须重新构建

这是最容易踩的坑：

| 场景 | 该用什么命令 | 原因 |
|---|---|---|
| 电脑开机后重新启动 | `docker compose up -d` | 镜像已存在，无需重建 |
| **改过 `api/` 或 `web/` 里的代码** | `start.bat` / `start.ps1` | 容器**不挂载源码**，只重新构建才会把改动打进镜像 |
| 改了根目录 `.env` | `docker compose up -d` | 重建容器才会重新读取环境变量 |
| 第一次在新电脑上跑 | `start.bat` / `start.ps1` | 需要首次构建镜像 |

> 判断口诀：**动代码 → 用 start.bat；只重开机 → 用 up -d。**

### 一键重建（推荐给"改完代码要落地"的场景）

如果改过代码后想**稳妥地**只重建、不依赖 `start.ps1` 的整套流程，项目根目录提供了 **`rebuild.ps1`**——它会对 `api` / `worker` / `web` 三个镜像分别构建，并**自动重试**（这两个后端镜像要从 ghcr.io 拉 `uv` 基础镜像，网络一抖就会 `TLS handshake timeout`，重试即可复用缓存层）：

```powershell
cd D:\ruanjian\ecommerce-operation-assistant; .\rebuild.ps1
```

跑完看到 `DONE: all images rebuilt ... are now LIVE.` 即代表所有待落地的代码改动已打进镜像并重启生效。若某个镜像重试后仍失败，脚本会提示检查 Docker Desktop / 网络，重跑一次即可。

> 不想开 PowerShell 也行：直接双击项目根目录的 **`rebuild.bat`**（功能完全相同，内部就是调用 `rebuild.ps1`）。

---

## 七、常见问题速查

| 现象 | 处理 |
|---|---|
| 提示「Docker 守护进程未运行」 | 先打开 Docker Desktop，等托盘变绿，再重跑 `start.bat` |
| 双击 `start.bat` 没反应 | 右键 → 用 PowerShell 运行；或先按 `start.bat` 属性确认没被杀毒软件拦 |
| 提示端口被占用 `address already in use` | 3000 或 8000 被别的程序占了。改项目根目录 `.env` 里的 `WEB_PORT` / `API_PORT`，然后 `docker compose up -d` |
| `api` 起不来、反复重启 | 多半是 MySQL 还在初始化（首次约 30~60 秒）。等一会，或 `docker compose logs -f api` 看日志 |
| 首次启动特别慢 | 要构建前后端镜像，正常。二次启动有缓存，通常 1 分钟内 |
| 浏览器打开是空白 / 转圈 | 等 10~20 秒刷新；或 `docker compose ps` 确认 web 是否 Up |
| 登录提示「邮箱或密码不正确」 | 未注册或密码错。先到 `/register` 注册一个账号 |
| 提示「该邮箱已被注册」 | 换一个邮箱，或直接用这个邮箱登录 |
| 改了代码但页面没变化 | 容器不挂载源码，必须重新构建。重新跑 `start.bat` |
| 中文提示显示乱码 | 用「双击 `start.bat`」的方式启动（bat 会自动切 UTF-8 代码页）；不要从 Git Bash 里跑 |
| 生成视频报「Access Denied」 | 火山引擎账号未开通即梦视频生成权限，属账号授权，非代码问题 |
| 生成**图片**也报「Access Denied」 | 2026-10-15 本机实测：账号余额不足时图片与视频会被同批拒绝（`code 50400`）。文本模型不受影响，`/settings` 测 text 返回 200 |
| 构建 web 镜像时 `npm ci` 报 `ECONNRESET` | `registry.npmjs.org` 在本机持续被连接重置。已在 `web/Dockerfile` 两处 `npm ci` 加 `--registry=https://registry.npmmirror.com`；若复发先查这两行是否被改回 |
| 基础镜像拉不下来（`EOF` / `502 Bad Gateway`） | 本机三个加速源全部失效，且 Docker 首源失败后不回退。直接跑 `start.bat` / `start.ps1`，它会自动从华为云 SWR 与 `ghcr.nju.edu.cn` 补拉并 retag 回标准名 |

---

## 八、完整操作一览（复制即用）

```powershell
# 1) 启动（先确保 Docker Desktop 已运行）
cd D:\ruanjian\ecommerce-operation-assistant; .\start.ps1

# 2) 查看服务状态
docker compose ps

# 3) 日常重启（没改代码时，更快）
docker compose up -d

# 4) 看日志（排障时用）
docker compose logs -f api
docker compose logs -f worker

# 5) 停止（不删数据）
docker compose down
```

---

## 九、关键文件速查

| 文件 | 作用 |
|---|---|
| `start.bat` | **一键启动**（双击这个） |
| `start.ps1` | 一键启动的实际逻辑（`start.bat` 调用它） |
| `stop.bat` | **一键停止**（双击这个） |
| `rebuild.ps1` | **只重建镜像（带重试）**：改完代码让改动落地用这个（PowerShell 运行） |
| `rebuild.bat` | `rebuild.ps1` 的**双击版**：不用开 PowerShell，双击即可触发带重试重建 |
| `docker-compose.yml` | 6 个服务的编排定义 |
| `.env` | 真实配置（密码、端口、模型 Key），不会提交到 Git |
| `RUN.md` | 完整技术手册（端口、日志、本地开发、常见问题） |

---

## 十、所有功能落地验证清单（重建后逐条核对）

改完代码并执行 `.\rebuild.ps1`（或 `.\start.ps1`）后，按下面逐条确认。**凡是打勾项都代表"功能已实时落地"**。

| # | 功能 | 怎么验证 | 落地前提 |
|---|---|---|---|
| 1 | 6 容器全 Up | `docker compose ps` → mysql/redis/agent-checkpoints 显示 healthy，web/api/worker Up | 启动即生效 |
| 2 | 登录页 5:5 版式 | 打开 `/login`，左品牌墙:右表单 = 5:5 | 之前已重建，已落地 |
| 3 | 注册/登录可用 | `/register` 注册 → 登录成功，自动写入 operator 角色 + workspace 成员关系 | 数据层已修复，已落地 |
| 4 | 新建店铺/商品可见 | 新建后列表能看到（workspace_id 已归位默认工作区） | 数据层已修复，已落地 |
| 5 | 设置页 Provider 对齐 | `/settings`：图片 Provider 显示灰色只读「即梦 Jimeng（火山引擎）」；视频 Provider 下拉只有「Jimeng / 即梦」；占位符均为火山真实值 | **需 rebuild 才生效** |
| 6 | 竞品监控自动调度 | 新建一个竞品监控 → `docker compose logs -f worker \| findstr competitor`，每 ~10 分钟出现一次自动拉取；不再只能手动点「检查」 | **需 rebuild 才生效** |
| 7 | 视频生成通道 | `/settings` 点「测试视频模型」→ 提示通道可达、已接受任务（task_id）；或实际生成一条短视频出 MP4 | 账号已开通，已实测火山 `code=10000` |
| 8 | course-stage 孤儿页已移除 | 访问 `/course-stage` 应返回 404（无此路由） | **需 rebuild 才生效** |

> 说明：第 5/6/8 项是 2026-10-14 的代码改动（前端 Provider 对齐、竞品监控接入 beat、删除孤儿页）。它们**已写入源码并通过静态校验，但容器不挂载源码，必须执行一次 `.\rebuild.ps1` 才会真正落地**。第 7 项视频功能已用真实 AK/SK 直连火山实测通过，无需改码。

---

> 文档更新：2026-10-14 · 在 2026-10-13 启动演练基础上，补充"一键重建（rebuild.ps1）"与"所有功能落地验证清单（第十节）"。代码改动（设置页 Provider 对齐 / 竞品监控 beat / 删 course-stage）需 `.\rebuild.ps1` 后才能落地。
