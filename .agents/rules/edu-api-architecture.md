# edu-api Core Architectural Rules & Directives

These rules must be followed by all agents working on the `edu-api` codebase.

---

## 1. Middleware & Request Pipeline Rules
- **Stripe Webhook Raw Body Ordering**: `app.use("/api/v1/payments/webhook", express.raw({ type: 'application/json' }))` in [app.js](file:///home/runner/work/github_automation/github_automation/workspace_target/app.js) MUST remain mounted BEFORE `express.json()`. Breaking this order destroys Stripe webhook signature verification.
- **Async Route Handlers**: All controller route handlers MUST be wrapped with `asyncHandler(fn)` from [utils/paginationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/paginationHelper.js) to ensure rejected promises bubble to `errorMiddleware`.
- **Validation Execution**: All controllers receiving user input MUST call `handleValidationErrors(req)` from [utils/validationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/validationHelper.js) immediately at the start of execution.
- **Custom Error Throwing**: Use `throw createError(message, statusCode)` from [utils/validationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/validationHelper.js) rather than generic `new Error()`.

---

## 2. Database & Data Integrity Rules
- **ES Modules MySQL Driver**: Use `mysql2/promise` through `dbConnectionPromise` exported by [config/db.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/db.js).
- **Transactions Required**: Multi-query operations mutating user, device, profile, or subscription state MUST use `withTransaction(dbConnectionPromise, async (connection) => { ... })` from [utils/paginationHelper.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/paginationHelper.js).
- **Duplication & Upsert Safety**: MySQL `ON DUPLICATE KEY UPDATE` or explicit checks MUST be used for idempotent insertions (`user_devices`, `user_profiles`, `user_subscriptions`).

---

## 3. Caching & Realtime Messaging Rules
- **Redis SCAN Over KEYS**: Cache invalidation MUST use `clearCache(pattern)` from [utils/cache.js](file:///home/runner/work/github_automation/github_automation/workspace_target/utils/cache.js). NEVER call `redisClient.keys()` as it blocks Redis single-threaded execution in production.
- **Socket.IO Notification Helper**: Cross-process realtime events MUST use `socketIO.notify(room, event, data)` from [config/socket.js](file:///home/runner/work/github_automation/github_automation/workspace_target/config/socket.js). This automatically handles in-process direct emits or worker-process Redis pub/sub broadcasting (`socket-notifications` channel).

---

## 4. Authentication, Tokens & Devices
- **Secrets Isolation**:
  - `ACCESS_TOKEN_SECRET`: General auth (`authMiddleware` -> `req.user`).
  - `SHORT_TOKEN_SECRET`: Password reset flow (`resetMiddleware`).
  - `OTP_TOKEN_SECRET`: OTP authentication.
  - `WEB_TOKEN_SECRET`: Web checkout verification token.
  - `CHECKSUM_SECRET`: Checkout validation HMAC-SHA256 signature.
- **Device Fingerprinting**: When `device_id` is omitted or device is `web`, compute fingerprint via SHA-256 hash of `${userAgent}:${acceptLanguage}:${ip}` (`generateDeviceFingerprint(req)` in [controllers/auth.controllers.js](file:///home/runner/work/github_automation/github_automation/workspace_target/controllers/auth.controllers.js)).
- **Reviewer Email Bypass**: User with email matching `process.env.REVIEWER_EMAIL` (`isReviewer(email)`) bypasses subscription checks for store reviewer access.

---

## 5. Standard Response Format
All API endpoints must return JSON conforming to standard envelope:
- **Success**: `{ isSuccess: true, data: ..., message?: string }` via `sendSuccess`, `sendPaginatedResponse`, or `sendCursorPaginatedResponse`.
- **Failure**: `{ isSuccess: false, message: string, data?: any }` handled automatically by [middleware/error.middleware.js](file:///home/runner/work/github_automation/github_automation/workspace_target/middleware/error.middleware.js).
