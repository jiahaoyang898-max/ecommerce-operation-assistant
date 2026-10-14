# 电商运营助手 — 项目评估与优化报告

> 评估时间：2026-10-13
> 评估范围：`D:\ruanjian\ecommerce-operation-assistant`（web / api / worker / MySQL / Redis / Postgres）
> 评估方式：后端测试套件 + 全端点探测 + 数据库完整性校验 + 容器日志分析 + 前端构建验证

---

## 一、故障根因：新建店铺等功能全部不可用

### 1.1 现象

登录后访问工作台，新建店铺、商品、诊断等所有业务操作失败；容器日志中 `GET/POST /api/v1/stores`、`/api/v1/products` 持续返回 **403 Forbidden**。

### 1.2 排查路径

| 步骤 | 操作 | 结论 |
| --- | --- | --- |
| 1 | `git status` / `git diff` 审查全部改动 | 37 个文件被改，但**无任何功能逻辑改动**（颜色类 `slate/cyan` → `brand-*`），排除「源码被改坏」 |
| 2 | 分析 api 容器日志 | **只有 403，无任何 5xx、无异常堆栈**；`/auth/me`、`/api/v1/workspaces` 均为 200 |
| 3 | 阅读 `resolve_workspace_access()` 与 `_bind_workspace_to_session()` | 全部业务接口依赖「用户 ↔ 工作区成员关系」，关系缺失即抛 403 |
| 4 | 查询 `workspace_memberships` | **`owner@example.com`(id=1) 没有任何成员关系记录** ← 直接根因 |
| 5 | 查询业务表的 `workspace_id` | `stores` / `products` / `agent_runs` 的 `workspace_id = NULL`，被租户过滤条件排除，导致列表看不到既有数据 |

> 说明：`information_schema.tables.table_rows` 对 InnoDB 是**估算值**，曾一度显示 `workspaces` 为 0 行造成误判，后续一律改用真实 `COUNT(*)` 与 `SELECT` 复核。

### 1.3 修复动作

| 类别 | 内容 |
| --- | --- |
| 补成员关系 | 为 `user_id=1` 补 `workspace_memberships(workspace_id=1, role=owner, status=active)` |
| 补数据归属 | 将 `stores` / `products` / `agent_runs` 中 `workspace_id IS NULL` 的记录归入默认工作区 `id=1` |

### 1.4 验证证据

| 项目 | 修复前 | 修复后 |
| --- | --- | --- |
| `GET /api/v1/stores` | 403 | **200** |
| `POST /api/v1/stores` | 403 | **201 Created**（实测创建成功，验证后已清理） |
| 店铺列表 | 空 | 恢复显示「课堂食品店」 |
| 商品列表 | 空 | 恢复显示「低糖燕麦饼干」 |

---

## 二、全面体检结果

### 2.1 后端测试套件

| 项目 | 结果 |
| --- | --- |
| 用例总数 | 169 |
| 通过 | **169** |
| 失败 | 0 |
| 耗时 | 21.05s（优化前 85.90s，降低约 75%） |

### 2.2 API 全端点探测（26 个 GET）

| 身份 | 非 200 数量 | 明细 | 判定 |
| --- | --- | --- | --- |
| owner (id=1) | 3 | `links/r/{short_code}` 404、`agent/tasks/{id}` 404、`agent/tasks/{id}/runs` 404 | **均为正确业务响应**（资源不存在） |
| operator (id=4) | 4 | 上述 3 项 + `GET /api/v1/users` 403 | 403 为正确权限校验（用户管理仅 owner） |

结论：**零真实故障**；写操作端点在故障期间为 403，修复后 200/201。

### 2.3 数据库完整性

| 检查项 | 结果 |
| --- | --- |
| 孤儿外键（store/product/membership 指向不存在的父记录） | 0 |
| 无成员关系的用户 | 0 |
| 重复邮箱用户 | 0 |
| 卡死的生成任务（pending / running 长期未推进） | 0（succeeded 4 / failed 1 / cancelled 9） |

### 2.4 运行时日志

| 服务 | 结果 |
| --- | --- |
| api | 无 5xx、无异常堆栈；历史 403 全部来自本次故障期间 |
| worker | Celery beat 4 项定时任务正常调度（`dispatch-agent-outbox` 5s、`sweep-generation-jobs` 5s 等），无失败任务 |

### 2.5 前端

| 项目 | 结果 |
| --- | --- |
| `next build` | 通过（重建镜像时 exit 0，28 个路由全部产出） |
| 关键页面 | `/`、`/settings` 均 200 |

---

## 三、本次落地的优化

### 优化 1 — 修复检查点连接串的 URL 编码缺陷（真实缺陷）

- **文件**：`api/app/core/config.py`
- **问题**：`checkpoint_database_url` 直接把用户名/密码拼进连接串。若密码含 `@ : / ?` 等保留字符，URL 会被截断，导致 Agent 检查点数据库连接失败。
- **修复**：拼接前对用户名与密码做 RFC 3986 转义（`urllib.parse.quote(..., safe="")`）。
- **依据**：`test_config.py::test_checkpoint_url_includes_reserved_password_characters` 正是为此缺陷编写的用例，此前长期失败。

### 优化 2 — 测试与外部供应商解耦（测试可靠性）

- **文件**：`api/tests/conftest.py`
- **问题**：`Settings` 会读取 `api/.env`，其中存有**真实密钥**。导致「未配置边界」类用例实际发起了**真实外网调用**，结果随环境漂移（无网络即失败），并产生真实调用开销。
- **修复**：在 conftest 中显式清空 `LLM_*` / `IMAGE_*` / `VIDEO_*` 供应商配置，使测试确定、离线、快速。
- **收益**：测试耗时 85.9s → **21.1s**。

### 优化 3 — 同步 5 处落后于实现的测试断言

| 文件 | 原断言 | 现断言 | 原因 |
| --- | --- | --- | --- |
| `test_config.py` | `Production requires AUTH_SECRET_KEY` | `AUTH_SECRET_KEY must be set to a strong value in production` | 错误文案已在重构中改进 |
| `test_config.py` | `Production requires a strong Agent checkpoint database password` | `AGENT_CHECKPOINT_PASSWORD must be set to a strong value in production` | 同上 |
| `test_config.py` | `settings.agent_checkpoint_connection_url` | `settings.checkpoint_database_url` | 属性已更名 |
| `test_stage03_flow.py` | 诊断生成必须返回 501「尚未接入」 | 返回 **201** 并落库 1 条诊断、不产生异步任务 | 诊断已接入（同步规则生成） |
| `test_stage03_flow.py` | 断言 `app.agents` 未被导入 | 断言 agent 端点在 OpenAPI 中已注册 | Agent 能力已正式接入 |
| `test_stage14_boundaries.py` | image/video 测试接口返回 501 | 未配置时返回 **400** | 已从 stub 升级为真实实现，未配置应在调用前拦下 |

> 修复后测试套件重新成为可信的回归防线。

### 优化 4 — 数据修复（见第一章）

---

## 四、遗留风险与建议

| 优先级 | 风险 | 建议 |
| --- | --- | --- |
| 中 | **成员关系仍是单点脆弱项**：一旦 `workspace_memberships` 被误删，该账号所有业务接口立刻 403，且错误信息为英文技术文案，使用者难以理解 | 可在登录时对 **owner 角色**做一次幂等自愈（仅补充默认工作区关系，不改变权限语义）；或把 403 文案改为可读中文 |
| 低 | 生产镜像内不含 pytest，无法在容器内跑测试 | 属正常实践；回归验证在本地 venv 执行即可 |
| 低 | 视频模型不可用 | 火山引擎账号未开通即梦视频生成（`code 50400 Access Denied`），需控制台开通，非代码问题 |
| 低 | `stores` / `products` 历史数据的 `workspace_id` 曾被置空 | 已归位；建议清理类操作统一通过接口完成，避免绕过租户字段 |

---

## 五、结论

1. 本次「新建店铺等功能不可用」**不是源码缺陷**，而是**数据层的工作区成员关系与租户归属缺失**，已修复并实测验证。
2. 项目整体健康：**测试 169 项全绿、26 个读接口零故障、数据库零孤儿、日志无 5xx**。
3. 本次额外修复了 1 个真实实现缺陷（连接串 URL 编码）并恢复了测试套件的可信度与执行效率。
