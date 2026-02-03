# ⚙️ Process Manager Clean Rebuild Research

## Overview
**Museum File Examined:** `src/process-manager.test.ts` (555 lines, 44 tests)
**Clean Rebuild Structure:** 2 intentional files (≤275 lines each)
**Test Patterns Extracted:** 44 test scenarios for clean replication

## 📁 Intentional File Structure

### 1. `tests/unit/process-manager/lifecycle.test.ts` (~275 lines)
**Test Category:** start + stop + cleanup + getConfig
**Tests:** 28 tests

#### start Method Tests (17 tests)
- `should spawn process with correct binary path`
- `should pass correct environment variables`
- `should resolve relative data paths to absolute`
- `should use absolute data paths as-is`
- `should use default data path if not provided`
- `should merge additional environment variables`
- `should merge base env with additionalEnvVars`
- `should pass cwd option if provided`
- `should capture stdout output when verbose is true`
- `should capture stderr output`
- `should not log empty stdout lines`
- `should throw error if process is already running`
- `should handle spawn errors`
- `should set process to null on exit`
- `should not log startup messages when verbose is false`
- `should not capture stdout when verbose is false`

#### stop Method Tests (4 tests)
- `should send SIGTERM to stop process`
- `should wait for process to exit gracefully`
- `should force kill after timeout`
- `should do nothing if no process is running`
- `should handle kill errors on SIGTERM`

#### cleanup Method Tests (2 tests)
- `should stop process and clear config`
- `should not throw if no process is running`

#### getConfig Method Tests (5 tests)
- `should return null when no process has been started`
- `should return config after process is started`
- `should preserve config after process is stopped`
- `should clear config after cleanup`

---

### 2. `tests/unit/process-manager/monitoring.test.ts` (~275 lines)
**Test Category:** isRunning + getPid + kill
**Tests:** 16 tests

#### isRunning Method Tests (3 tests)
- `should return false when no process is running`
- `should return true when process is running`
- `should return false after process is killed`

#### getPid Method Tests (2 tests)
- `should return undefined when no process is running`
- `should return process PID when running`

#### kill Method Tests (4 tests)
- `should send SIGKILL to force kill process`
- `should log kill message when verbose is true`
- `should do nothing if no process is running`
- `should handle kill errors`

## 📊 Clean Replication Notes

### Test Pattern Replication Rules
1. **Pattern-Based Recreation**: Use extracted test names and assertions to build fresh implementations
2. **Intentional Setup Design**: Design setup/teardown based on functional needs, not copied code
3. **Clean Import Architecture**: Use `@tests/` aliases from the start
4. **Functional Coverage**: Ensure each file covers its behavioral domain completely

### Implementation Dependencies
- **lifecycle.test.ts**: Core process management behaviors (start/stop/cleanup)
- **monitoring.test.ts**: Runtime monitoring behaviors (status checks, killing)

### File Size Discipline
- Target: ≤275 lines per file (well under 333 limit)
- Both files: ~275 lines
- Meet size constraints through behavioral separation

---

*Generated: Phase 0 Clean Rebuild Research*
*Process Manager: 555 lines examined → 2 clean files (44 test patterns extracted)*
