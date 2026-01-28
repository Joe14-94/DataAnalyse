## 2026-01-23 - [Optimize 'in' filter performance]
**Learning:** Identified an O(N*M) bottleneck in pivot and widget filtering engines where `Array.includes()` was called for every row against a filter array. Converting filter values to a `Set` pre-loop reduces complexity to O(N+M).
**Action:** Prioritize identifying O(M) operations inside O(N) loops in data processing logic.
