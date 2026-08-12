# AGENTS.md - Antigravity Agent Guidelines for `edu-api`

Welcome to `edu-api`, a Node.js (ES Modules, Node >= 22) REST API for educational content, user subscriptions, payments, and multi-device streaming.

## Project Quick Reference

- **Entry Point (Web Server)**: [index.js](file:///home/runner/work/github_automation/github_automation/workspace_target/index.js) -> [app.js](file:///home/runner/work/github_automation/github_automation/workspace_target/app.js)
- **Entry Point (Worker)**: [workers/webhookWorker.js](file:///home/runner/work/github_automation/github_automation/workspace_target/workers/webhookWorker.js)
- **Environment Config**: Loaded from `.env.${NODE_ENV || 'production'}.local` in [config/env.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/env.js)
- **Database**: MySQL (`mysql2/promise` pool in [config/db.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/db.js))
- **Cache & Queue**: Redis (`ioredis` in [config/redis.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/redis.js)) & BullMQ (`libs/queue.js`)
- **Realtime Push**: Socket.IO with Redis PubSub in [config/socket.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/socket.js)
- **Primary Skill**: Activate `.agents/skills/edu-api-guide/SKILL.md` for in-depth architecture, data schemas, API blueprints, and workflow guides.

## Essential Directives for Future Agents

1. **Do Not Break Express 5 Middleware Ordering**:
   `app.use("/api/v1/payments/webhook", express.raw({ type: 'application/json' }))` in [app.js](file:///home/runner/work/github_automation/github_automation/workspace_target/app.js) must strictly stay before `app.use(express.json())`.

2. **Use Established Helpers**:
   - `asyncHandler` in [utils/paginationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/paginationHelper.js) for async controllers.
   - `handleValidationErrors(req)` and `createError(msg, code)` in [utils/validationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/validationHelper.js).
   - `withTransaction(pool, callback)` in [utils/paginationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/paginationHelper.js) for multi-query operations.
   - `getOrSetCache` and `clearCache` (using `scanStream`) in [utils/cache.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/cache.js).
   - `socketIO.notify(room, event, data)` in [config/socket.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/socket.js).

3. **Check Syntax & Linting**:
   Before finalizing changes, run syntax validation (`node --check index.js`) or `npx eslint .`.
