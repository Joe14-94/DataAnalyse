## 2026-01-23 - [Optimize 'in' filter performance]
**Learning:** Identified an O(N*M) bottleneck in pivot and widget filtering engines where `Array.includes()` was called for every row against a filter array. Converting filter values to a `Set` pre-loop reduces complexity to O(N+M).
**Action:** Prioritize identifying O(M) operations inside O(N) loops in data processing logic.

## 2026-01-29 - [Optimize DataExplorer search and stats]
**Learning:** Global search in DataExplorer was O(N*M) because it used Object.values() and repeated toLowerCase() on every keystroke. Pre-calculating a `_searchIndex` in a memoized block reduces complexity to O(N). Also, numeric statistics calculation was refactored from multi-pass per column to a single-pass accumulator ((X) = E[X^2] - (E[X])^2$) for all numeric fields.
**Action:** Always pre-calculate search strings or indexes for large datasets to avoid O(N*M) search in UI components.

## 2026-02-05 - [Optimize Pivot Engine Aggregation]
**Learning:** In the Pivot Engine, aggregation logic was O(N * M) where N is rows and M is metrics. By moving the column metrics lookup outside the metric loop and replacing `.forEach` with standard `for` loops, we reduced per-row overhead. Also, explicit string concatenation for column keys proved faster than `.map().join()` for small numbers of fields.
**Action:** Move Map/Object lookups outside inner-most loops in data processing engines.

## 2026-01-31 - [Optimize Formula Parser with Token Caching]
**Learning:** Formula evaluation in Pivot Tables/Widgets was a bottleneck due to re-tokenizing and re-parsing the same formula for every row. Introducing a global `FORMULA_CACHE` and refactoring `FormulaParser` to separate tokenization from evaluation reduced execution time by ~60%. Also, manual character comparisons (char >= '0' && char <= '9') proved significantly faster than regex tests inside the tokenizer loop.
**Action:** Always cache tokenization/parsing results for operations repeated across large datasets. Prefer manual char checks over regex for simple tokenization in tight loops.

## 2026-02-12 - [Optimize Smart Number Parsing with Result Caching]
**Learning:** Number parsing was identified as a bottleneck in the Pivot Engine aggregation loop (O(N*M)). Even with fast paths, regex and string manipulations add up across 100k+ rows. Implementing a simple result cache (Map) with a size limit (10k) significantly reduces per-row overhead for datasets with repeating values.
**Action:** Always consider memoization for utility functions called within O(N) data processing loops, especially those performing string manipulation or regex tests.
