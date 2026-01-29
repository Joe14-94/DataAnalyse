## 2026-01-23 - [Optimize 'in' filter performance]
**Learning:** Identified an O(N*M) bottleneck in pivot and widget filtering engines where `Array.includes()` was called for every row against a filter array. Converting filter values to a `Set` pre-loop reduces complexity to O(N+M).
**Action:** Prioritize identifying O(M) operations inside O(N) loops in data processing logic.

## 2026-01-29 - [Optimize DataExplorer search and stats]
**Learning:** Global search in DataExplorer was O(N*M) because it used Object.values() and repeated toLowerCase() on every keystroke. Pre-calculating a `_searchIndex` in a memoized block reduces complexity to O(N). Also, numeric statistics calculation was refactored from multi-pass per column to a single-pass accumulator ((X) = E[X^2] - (E[X])^2$) for all numeric fields.
**Action:** Always pre-calculate search strings or indexes for large datasets to avoid O(N*M) search in UI components.
