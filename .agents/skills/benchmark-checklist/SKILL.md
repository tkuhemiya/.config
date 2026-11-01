---
name: benchmark-checklist
description: Vet a performance measurement before you report or act on it, covering the limiter, tuning, physical limits, errors, repeatability, relevance, and whether the work ran. Use when you run a benchmark or report a speedup or regression you measured.
---

# Benchmark checklist

Use this whenever you produce a performance number: a before and after, a regression claim, a library or config choice. Answer each question with evidence from a run, not a guess from reading code.

For a quick ballpark the user asked for, one run is enough. Still check questions 4 and 7, and say it was one run. A choice between options is never a ballpark.

## Before you run

- Write the claim you expect to make, in the words you would ship, such as "export is 30% faster at p50 on the 60k-row dataset". The questions test that sentence.
- Read the measurement script. Note what it times, counts, and ignores.
- Check load with `uptime` and cores with `sysctl -n hw.ncpu` (or `nproc`). If the machine is busy and you can't stop what's running, alternate the sides so both see the same noise, and say so.

## The questions

1. **Why not twice as fast?** Name the limiter. Profile in a run you don't report, because profilers slow the work. Use per-process CPU (`top`), a runtime profiler (`node --cpu-prof`, `py-spy`, `perf`), I/O wait, and syscall counts, then map the hot spot to source. Watch the load generator too. If it saturates first, you measured the load generator.
2. **Was each side tuned?** Run every side the way production does: release builds, production flags, batching, pools, caches as warm as production sees them, same versions and data. If one side runs on defaults, you compared configurations, not implementations. Tune it and measure again before picking a winner.
3. **Does it break a physical limit?** Compare bytes per second with disk and network bandwidth, and operations per second times cost with your cores. Removing a piece that takes 10% of the run can make it at most about 11% faster. A result past a limit measured something else: a cache, a no-op, or a bug.
4. **Did it error?** Count failures and non-success responses, and check outputs are correct, not just present. Rejections are fast. Timeouts and retries are slow. If the script doesn't count errors, add the count.
5. **Does it reproduce?** Run each side at least 5 times, alternating A, B, A, B, so warmup and drift favor neither. Report median and range. A gap smaller than run-to-run variation is no measurable difference.
6. **Does it matter?** Next to a micro result, measure the end-to-end path a user waits on, with realistic data and concurrency. Report the micro result as a share of the whole.
7. **Did the work happen?** Confirm it ran inside the timed region: the request reached the server, the rows were written, the result was used. Unawaited promises, uniterated generators, and results the JIT discards produce numbers for work that never ran.

## Report

- Lead with the verdict: faster, slower, no measurable difference, or inconclusive.
- Give the number with its unit, run count, range, and limiter, such as "p50 41 ms → 33 ms, median of 7 runs per side, range 32 to 35 ms after, bound by JSON parsing on one core."
- Call it inconclusive when you can't name the limiter, a side ran untuned, or you couldn't check questions 4 and 7. Name the gap.
