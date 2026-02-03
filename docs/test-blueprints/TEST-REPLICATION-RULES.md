# 📋 Test Replication Rules

## Overview
Guidelines for intentionally replicating test patterns from museum research while building clean, maintainable test files from scratch.

## 🎯 Core Principles

### 1. Pattern-Based Replication
- **Extract Patterns**: Use research to understand test behaviors and assertions
- **Intentional Recreation**: Build tests from scratch using extracted patterns
- **Clean Implementation**: No technical debt inheritance from original files

### 2. Functional Domain Organization
- **Behavior-First**: Organize by what tests verify, not original file structure
- **Logical Grouping**: Group related test scenarios by functional responsibility
- **Clean Separation**: Clear boundaries between different concerns

### 3. File Size Discipline
- **Hard Limit**: ≤333 lines per file
- **Target**: ≤250 lines average
- **Practical**: ≤275 lines for complex functional domains

## 📋 Replication Rules

### Rule 1: Pattern-to-Implementation
```typescript
// MUSEUM RESEARCH: Extracted pattern
// Original test: "should return "latest" when no version is specified"

// CLEAN REPLICATION: Intentional recreation
describe('Binary Manager - Version Resolution', () => {
  it('should return "latest" when no version is specified', () => {
    // Fresh implementation based on extracted pattern
    const result = resolveVersion();
    expect(result).toBe('latest');
  });
});
```

### Rule 2: Clean Import Architecture
```typescript
// MUSEUM RESEARCH: Identified dependencies
// Original: '../../../test/helpers' → @tests/helpers

// CLEAN IMPLEMENTATION: Consistent aliases from start
import { someHelper } from '@tests/helpers';
import { testFixture } from '@tests/fixtures';
```

### Rule 3: Intentional Setup Structure
```typescript
// MUSEUM RESEARCH: Identified setup patterns
// Original: beforeEach with vi.clearAllMocks() + custom setup

// CLEAN IMPLEMENTATION: Purposeful setup design
describe('Focused Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnvironment(); // Intentional, not copied
  });

  it('test 1', () => { /* Fresh implementation */ });
  it('test 2', () => { /* Fresh implementation */ });
});
```

### Rule 4: Functional Domain Respect
- **Sequential Implementation**: Build in logical dependency order
- **Clean Setup**: Design setup code intentionally for each domain
- **Mock Strategy**: Implement mocks based on functional needs

## 🔧 Clean Replication Steps

### Step 1: Pattern Analysis
1. Review extracted test patterns from research blueprints
2. Understand functional behavior being tested
3. Identify dependencies and setup requirements

### Step 2: Intentional File Creation
1. Create new file with clean structure
2. Implement imports using established aliases
3. Design setup/teardown based on functional needs

### Step 3: Pattern Replication
1. Recreate test logic based on extracted patterns
2. Implement assertions that match research findings
3. Ensure functional coverage matches original behavior

### Step 4: Clean Validation
1. Run tests to verify functional correctness
2. Check coverage metrics meet requirements
3. Validate file size constraints

## 📊 Clean Organization Patterns

### Pattern 1: Behavior-Driven Separation
```
Research: download, extraction, verification, lifecycle behaviors
├── download.test.ts (220 lines) - Version + URL + Download behaviors
├── extraction.test.ts (210 lines) - Archive + Checksum behaviors
├── verification.test.ts (200 lines) - Integration + Edge case behaviors
└── lifecycle.test.ts (250 lines) - Persistence + Performance behaviors
```

### Pattern 2: Operation-Based Grouping
```
Research: CRUD + Query + Batch + Error behaviors
├── crud.test.ts (180 lines) - Create/Read/Update/Delete behaviors
└── advanced.test.ts (160 lines) - Query/Batch/Error handling behaviors
```

### Pattern 3: Lifecycle-Based Organization
```
Research: start/stop/cleanup + monitoring behaviors
├── lifecycle.test.ts (275 lines) - Process management behaviors
└── monitoring.test.ts (275 lines) - Runtime monitoring behaviors
```

## ⚠️ Clean Replication Pitfalls

### Pitfall 1: Accidental Code Copying
```typescript
// ❌ BAD: Copying implementation details
const result = oldFunction(); // Copied from museum

// ✅ GOOD: Recreating based on pattern
const result = newCleanFunction(); // Fresh implementation
```

### Pitfall 2: Import Inconsistency
```typescript
// ❌ BAD: Mixing old and new patterns
import { oldHelper } from '../../../test/helpers'; // Museum pattern

// ✅ GOOD: Consistent clean architecture
import { cleanHelper } from '@tests/helpers'; // Intentional design
```

### Pitfall 3: Size Constraint Violations
```typescript
// ❌ BAD: Over-stuffed file
// File: 350 lines (violates 333 limit)

// ✅ GOOD: Further functional separation
// File 1: 180 lines - Core behaviors
// File 2: 170 lines - Edge case behaviors
```

## 🧪 Clean Validation Checklist

### Pre-Replication
- [ ] Research patterns reviewed and understood
- [ ] Functional domains clearly identified
- [ ] File size targets calculated and realistic

### During Replication
- [ ] Clean imports using established aliases
- [ ] Intentional setup/teardown design
- [ ] Fresh implementation based on patterns

### Post-Replication
- [ ] All tests pass with expected behavior
- [ ] Coverage metrics meet or exceed baseline
- [ ] File sizes comply with constraints
- [ ] No import resolution errors

## 📈 Clean Success Metrics

- **Test Count**: All original test scenarios replicated
- **Coverage**: ≥ baseline maintained through clean implementation
- **File Size**: ≤333 lines per file through functional separation
- **Imports**: Consistent alias usage from day one
- **Architecture**: Clean, intentional design patterns

---

*Generated: Phase 0 Clean Rebuild Research*
*Purpose: Enable intentional test recreation without technical debt*

