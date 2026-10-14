# 电商运营助手 · 服务启动手册

> 技术栈：Next.js 16 + React 19 + Tailwind 4（前端） / FastAPI + Celery（后端） / MySQL 8.4 + Redis 7 + PostgreSQL 16（数据层）
> 全部服务由项目根目录 `docker-compose.yml` 编排，配置读取根目录 `.env`。

项目路径：`D:\ruanjian\ecommerce-operation-assistant`

---

## 一、服务与端口总览

| 服务 | 容器名 | 宿主端口 | 容器内端口 | 用途 | 访问地址 |
|---|---|---|---|---|---|
| 前端 Web | `web` | **3000** | 3000 | 工作台页面（Next.js） | http://localhost:3000 |
| 后端 API | `api` | **8000** | 8000 | REST 接口 + Swagger | http://localhost:8000/docs |
| 异步任务 | `worker` | 不暴露 | 8000 | Celery 消费者（生成 / Agent / 维护队列） | — |
| MySQL | `mysql` | **3306** | 3306 | 主业务库 `ecommerce_operation` | 127.0.0.1:3306 |
| Redis | `redis` | **6379** | 6379 | 缓存 + Celery broker | 127.0.0.1:6379 |
| PostgreSQL | `agent-checkpoints` | **5433** | 5432 | Agent 检查点库 `agent_checkpoints` | 127.0.0.1:5433 |

> 数据库与缓存仅绑定 `127.0.0.1`（本机可访问，局域网不可达）；前端与后端绑定 `0.0.0.0`。
> 端口均可在 `.env` 中修改：`WEB_PORT` / `API_PORT` / `MYSQL_PORT` / `REDIS_PORT` / `AGENT_POSTGRES_PORT`。

### 常用页面

| 页面 | 地址 |
|---|---|
| 登录页 | http://localhost:3000/login |
| 注册页 | http://localhost:3000/register |
| 工作台 | http://localhost:3000 |
| 设置页 | http://localhost:3000/settings |
| 接口文档 | http://localhost:8000/docs |

---

## 二、一键启动（推荐）

前提：已安装并启动 **Docker Desktop**。

```powershell
# 方式一：直接双击项目根目录的 start.bat

# 方式二：PowerShell 中执行
cd D:\ruanjian\ecommerce-operation-assistant
.\start.ps1
```

`start.ps1` 会自动完成 5 步：

1. 校验 Docker 守护进程与 Compose 是否可用（不可用直接给出明确提示）
2. 检查 `.env`：缺失时从 `.env.example` 生成；仍是占位密钥时自动替换为随机值
3. `docker compose up -d --build` 构建并拉起全部 6 个服务
4. 轮询等待 Web 就绪（最长约 5 分钟，首次启动较慢）
5. **自动打开浏览器**进入登录页

停止服务：

```powershell
# 双击 stop.bat，或：
cd D:\ruanjian\ecommerce-operation-assistant
docker compose down
```

> `down` 只删容器与网络，**数据卷保留**，下次启动数据仍在。

---

## 三、命令行启动（分场景）

### 3.1 启动全部服务（最常用）

```powershell
cd D:\ruanjian\ecommerce-operation-assistant
docker compose up -d --build
```

- `-d`：后台运行
- `--build`：代码有改动时重新构建镜像（无改动会走缓存，很快）

### 3.2 只启动单个服务

```powershell
docker compose up -d mysql              # 只起 MySQL（3306）
docker compose up -d redis              # 只起 Redis（6379）
docker compose up -d agent-checkpoints  # 只起 PostgreSQL 检查点库（5433）
docker compose up -d --build api        # 只起后端 API（8000，启动时自动执行 alembic 迁移）
docker compose up -d --build worker     # 只起 Celery worker
docker compose up -d --build web        # 只起前端（3000）
```

> `api` 与 `worker` 依赖三个数据服务 `healthy` 后才启动，单独起 `api` 时 Compose 会自动先拉起依赖。

### 3.3 前台启动，直接看日志

```powershell
docker compose up            # 全部服务前台运行
docker compose up api web    # 只前台跑后端与前端
```

### 3.4 本地开发（不使用 Docker）

```powershell
# 后端：先确保 .env 里的数据库 / Redis 可连通
cd D:\ruanjian\ecommerce-operation-assistant\api
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 前端
cd D:\ruanjian\ecommerce-operation-assistant\web
npm install
npm run dev
```

前端通过 `API_INTERNAL_BASE_URL`（服务端调用，容器内为 `http://api:8000`）与 `NEXT_PUBLIC_API_BASE_URL`（浏览器调用，为 `http://127.0.0.1:8000`）指向后端。

---

## 四、启动后验证（逐端口体检）

```powershell
# 1) 容器是否全部 Up
docker compose ps

# 2) 前端（期望 200）
curl.exe -s -o NUL -w "web      HTTP=%{http_code}\n" http://localhost:3000/login
curl.exe -s -o NUL -w "register HTTP=%{http_code}\n" http://localhost:3000/register

# 3) 后端（未带 token 期望 401，说明服务活着且鉴权生效）
curl.exe -s -o NUL -w "api      HTTP=%{http_code}\n" http://localhost:8000/api/v1/auth/me

# 4) 注册接口冒烟（期望 201，返回 access_token）
curl.exe -s -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d "{\"display_name\":\"测试\",\"email\":\"demo@example.com\",\"password\":\"Passw0rd123\"}"
```

一键体检（PowerShell）：

```powershell
3000,8000,3306,6379,5433 | ForEach-Object {
  $ok = (Test-NetConnection 127.0.0.1 -Port $_ -WarningAction SilentlyContinue).TcpTestSucceeded
  "端口 {0}: {1}" -f $_, $(if ($ok) { "可连通" } else { "不可连通" })
}
```

---

## 五、停止 / 重启 / 清理

```powershell
docker compose stop                # 停止容器，保留容器本身
docker compose start               # 重新启动已停止的容器
docker compose restart api         # 重启单个服务
docker compose down                # 停止并删除容器 + 网络（保留数据卷）

docker compose down -v             # 危险：同时删除数据卷，数据库数据清空
docker compose down --rmi local    # 连带删除本项目构建的镜像
```

---

## 六、日志查看

```powershell
docker compose logs -f             # 全部服务实时日志
docker compose logs -f api         # 只看后端
docker compose logs -f worker      # 只看 Celery worker
docker compose logs --tail 100 web # 最近 100 行前端日志
```

---

## 七、常见问题

| 现象 | 原因与处理 |
|---|---|
| 提示「Docker 守护进程未运行」 | 先启动 Docker Desktop，等托盘图标变绿后重跑 `start.bat` |
| 提示端口被占用（`bind: address already in use`） | 改 `.env` 里的 `WEB_PORT` / `API_PORT` / `MYSQL_PORT` 后重跑 |
| `api` 反复重启 | 多为 MySQL 首次初始化未完成（约 30–60 秒），`docker compose logs api` 查看 |
| 首次启动很慢 | 需拉取镜像 + 构建前后端，属正常；二次启动通常数十秒 |
| 登录报「邮箱或密码不正确」 | 未注册或账号被停用（同一提示）；先到 `/register` 注册 |
| 注册报「该邮箱已被注册」 | 该邮箱已存在，直接登录或更换邮箱 |
| 改了 `.env` 不生效 | 需 `docker compose up -d` 重建容器才会重新读取环境变量 |
| `start.ps1` 中文乱码 | 脚本须保持 **UTF-8 with BOM** 编码，用编辑器另存为「UTF-8 带 BOM」 |
| `start.ps1` 报 `?#Requires 无法识别` | 文件出现了**双 BOM**（`EF BB BF EF BB BF`）；重新保存为单个 BOM 即可 |

---

## 八、关键文件

| 文件 | 说明 |
|---|---|
| `docker-compose.yml` | 6 个服务的编排定义 |
| `.env` | 真实配置（密码、端口、LLM Key），不提交到 Git |
| `.env.example` | 配置模板，仅含占位值 |
| `start.bat` / `start.ps1` | 一键启动（含自动打开浏览器） |
| `stop.bat` | 一键停止 |
| `api/Dockerfile`、`web/Dockerfile` | 前后端镜像构建定义 |

---

## 九、落地测评结论（2026-10-13 全量实测）

### 9.1 覆盖范围与结果

| 测评项 | 覆盖范围 | 结果 |
|---|---|---|
| 前端构建 | `next build` | **通过**（exit 0，全部路由生成） |
| 后端接口 | 26 个 GET + 62 个写操作接口 | **全部可达**（详见 9.2） |
| 前端页面 | 10 个页面（含店铺 / 商品详情页） | **全部 200** |
| 业务链路 | 建店 → 建品 → 首页实时展示 | **通过** |
| 认证链路 | 注册 → 登录 → 退出 | **通过**（303 正常重定向） |
| AI 生成链路 | 诊断 / 主图方案 / 视频脚本 / 广告实验 / 广告推荐 / 复盘 / 库存建议 | **全部真实产出**（LLM 真实调用） |
| 图片生成 | 即梦 `jimeng_t2i_v30` 异步任务 | **通过**（产出真实 JPEG，可从 `/uploads/generated/` 访问） |
| Agent 链路 | 工作流目录 → 任务创建 → 待审批 → 审批放行 | **通过**（queued → awaiting_approval → approved） |
| 容器 | 6 个服务 | 全部 Up（mysql / redis / pg healthy） |

### 9.2 本次修复的三个真实缺陷

| # | 缺陷 | 根因 | 修复 |
|---|---|---|---|
| 1 | 生成任务永久卡在 `pending`（视频/图片任务入队后无人执行） | `enqueue` 写入的 `next_run_at` 经 MySQL DATETIME 秒精度四舍五入后，可能晚于 worker 收到消息的时刻，`run_generation_job` 随即 `return`；而兜底轮询函数 `process_next_generation_job()` **定义了却从未被调度** | 将 `process_next_generation_job` 接入 Celery 定时任务 `maintenance.sweep_generation_jobs`（每 5 秒） |
| 2 | 卡在 `running` 的任务无人回收 | `mark_stale_running_generation_jobs()` 同样**只定义未被调用**；HTTP 接口 `POST /workspace/generation-jobs/sweep-timeouts` 返回 501 | 打通 HTTP 接口（返回 `processed_count`）+ 新增定时任务 `maintenance.sweep_stale_generation_jobs`（每 60 秒） |
| 3 | 设置页「测试图片 / 视频模型」按钮点击必失败 | 原接口对 `target != text` 一律返回 **501**（stub） | 图片：改为真实提交最小生成任务（现已 200）；视频：返回**可读中文原因**而非裸报错 |

### 9.3 已知限制：视频模型（即梦 `jimeng_t2v_v30`）

**图片模型可用、视频模型不可用，用的是同一把 AK。** 实测对照：

| 调用 | HTTP | 返回 |
|---|---|---|
| `jimeng_t2i_v30`（图片） | 200 | `code 10000 Success`，返回 task_id |
| `jimeng_t2v_v30`（视频） | **401** | `code 50400 Access Denied` |
| `jimeng_t2v_v30_1080p` | **401** | `code 50400 Access Denied` |
| `jimeng_i2v_v30`（不存在） | 400 | `code 50200 req_key not supported` |

结论：**火山引擎账号尚未开通"即梦视频生成"能力的调用权限**，属账号授权问题，非代码问题。开通后无需改代码即可用。
在当前状态点击「测试视频模型」或「生成视频」，会得到中文提示：*视频模型不可用：供应商返回「Access Denied」(code 50400)，通常是当前火山引擎账号尚未开通该模型权限，请在火山引擎控制台开通对应能力后重试。*

### 9.4 边界与说明

- `/api/v1/users` 对 `operator` 角色返回 **403** 属**正常权限拦截**（用户管理仅 owner 可见），不是故障。
- 功能范围与最初版一致：除「移除演示数据入口」外，未新增或删除任何业务功能；本轮仅"接通"了原本定义了却未被调度的既有能力。
- 已知边界（最初版既有、非本次引入）：直接构造**空表单** `POST /products/create`、`/stores/create` 会返回 500（zod 校验异常未被捕获）。由于两个表单都带 `required`，浏览器会拦截空提交，**正常使用路径不可达**。

