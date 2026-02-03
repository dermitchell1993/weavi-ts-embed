# 🔄 Operations Clean Rebuild Research

## Overview
**Museum File Examined:** `src/operations.test.ts` (316 lines, 14 tests)
**Clean Rebuild Structure:** 2 intentional files (≤180 lines each)
**Test Patterns Extracted:** 14 test scenarios for clean replication

## 📁 Intentional File Structure

### 1. `tests/unit/operations/crud.test.ts` (~180 lines)
**Test Category:** Collection Management + CRUD Operations
**Tests:** 9 tests

#### Collection Management Tests (4 tests)
- `creates collection with text properties`
- `lists all collections`
- `retrieves collection by name after creation`
- `deletes a collection`

#### CRUD Operations Tests (5 tests)
- `inserts single object`
- `inserts batch objects`
- `updates an object`
- `deletes object by ID`
- `deletes objects by filter`

---

### 2. `tests/unit/operations/advanced.test.ts` (~160 lines)
**Test Category:** Query Operations + Batch Operations + Error Handling
**Tests:** 5 tests

#### Query Operations Tests (2 tests)
- `fetches with limit`
- `fetches with filters`

#### Batch Operations Tests (1 test)
- `bulk inserts 100+ objects`

#### Error Handling Tests (2 tests)
- `rejects invalid collection names`
- `rejects invalid data types`

## 📊 Clean Replication Notes

### Test Pattern Replication Rules
1. **Pattern-Based Recreation**: Use extracted test names and assertions to build fresh implementations
2. **Intentional Setup Design**: Design setup/teardown based on functional needs, not copied code
3. **Clean Import Architecture**: Use `@tests/` aliases from the start
4. **Functional Coverage**: Ensure each file covers its behavioral domain completely

### Implementation Dependencies
- **crud.test.ts**: Basic database operation behaviors (create, read, update, delete)
- **advanced.test.ts**: Complex database operation behaviors (queries, batch, error handling)

### File Size Discipline
- Target: ≤180 lines per file (well under 333 limit)
- crud.test.ts: ~180 lines
- advanced.test.ts: ~160 lines
- Both files meet size constraints through operation-based separation

---

*Generated: Phase 0 Clean Rebuild Research*
*Operations: 316 lines examined → 2 clean files (14 test patterns extracted)*

