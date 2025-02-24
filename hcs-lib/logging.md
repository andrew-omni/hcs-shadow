# 📜 Logging Guidelines for HCS Tools and Libraries

This document defines the **logging standards** and **best practices** for all HCS-related applications and libraries. Our logging system uses the standard **npm logging levels** and aims to:

- 📖 **Tell a coherent story** of user behavior
- 🎯 Ensure critical actions are clearly tracked
- 🔍 Provide sufficient detail for troubleshooting and debugging

---

## 🔥 **Logging Levels**

We use the default logging levels from **npm**:

| Level    | Value | Description                                |
|----------|-------|--------------------------------------------|
| `error`  | 0     | Critical issues requiring immediate attention |
| `warn`   | 1     | Warnings that indicate potential problems   |
| `info`   | 2     | Key actions taken by the user               |
| `http`   | 3     | (Optional) HTTP request logs (if applicable) |
| `verbose`| 4     | Detailed information for resolved actions   |
| `debug`  | 5     | Detailed information for debugging purposes |
| `silly`  | 6     | Extra logs for personal debugging (remove before final merge) |

---

## 🏆 **Logging Best Practices**

### 🔍 **INFO Logs**
- Emit **one `info` log** for every **key action** performed by the user.
- Examples:
  - Creating a new config set
  - Generating or updating an instance file
  - Saving or updating schema configurations

**Example:**
```
2024-02-24T14:12:34Z [INFO] configMgr:initConfigSet - Config set "alpha" created successfully.
```

### 📋 **VERBOSE Logs**
- Use `verbose` logs for **resolved sub-actions**.
- Should include additional context like:
  - Elapsed time for long-running operations
  - Results of a `validateAll()` or `buildAll()` operation
  - Summarized statistics (e.g., "5 schemas validated, 2 warnings")

**Example:**
```
2024-02-24T14:15:10Z [VERBOSE] validator:validateAll - Completed validation in 142ms. 0 errors, 2 warnings.
```

### 🛠 **DEBUG Logs**
- Use `debug` logs to capture:
  - Detailed internal processing steps
  - Function entry/exit points
  - Value changes in critical variables
- These logs are essential for diagnosing issues but should not overwhelm the console.

**Example:**
```
2024-02-24T14:17:20Z [DEBUG] schemaLoader:loadSchemas - Loading schema from path /configsets/alpha/schemas/user.json
```

### 💡 **SILLY Logs**
- Use `silly` logs for personal debugging needs during development.
- Must be **removed** or disabled before final merge.

**Example:**
```
2024-02-24T14:18:55Z [SILLY] cacheMgr:getCachedResource - Checking cache for resource ID: alpha.models.userModel
```

---

## 📐 **Log Message Format**

Each log entry should follow this structured format:

```
[timestamp] [log-level] short-cls-name:short-method-name - msg
```

### 🔑 **Log Components:**
- **timestamp** → Auto-generated timestamp in ISO format
- **log-level** → Logging level (e.g., `INFO`, `DEBUG`)
- **short-cls-name** → A short identifier for the emitting file/class
- **short-method-name** → A short identifier for the method or function
- **msg** → The actual log message

**Example Log Entry:**
```
2024-02-24T14:20:00Z [INFO] configMgr:createInstance - Instance "user-settings" successfully created.
```

---

## 🚀 **Final Checklist Before Merge**

✅ Remove all `silly` logs.

✅ Ensure all key user actions emit at least one `info` log.

✅ Include performance metrics (time elapsed) in `verbose` logs for important operations.

✅ Use `debug` logs to track critical internal operations.

---

Following these logging standards will help us maintain high-quality logs, making it easier to trace user actions, debug issues, and monitor system performance efficiently. 🔥