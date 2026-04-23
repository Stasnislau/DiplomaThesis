#!/usr/bin/env python3
"""
Parse k6 JSON summary output and produce a LaTeX-ready table
for the diploma thesis.

Usage:
    k6 run --summary-export=results.json load-test.js
    python3 generate-report.py results.json
"""
import json
import sys
from pathlib import Path


def ms(val: float) -> str:
    """Format microsecond value to milliseconds with 1 decimal."""
    return f"{val:.1f}"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-report.py <results.json>")
        sys.exit(1)

    data = json.loads(Path(sys.argv[1]).read_text())
    metrics = data.get("metrics", {})

    # Overall HTTP metrics
    http_dur = metrics.get("http_req_duration", {}).get("values", {})
    http_reqs = metrics.get("http_reqs", {}).get("values", {})
    http_fails = metrics.get("http_req_failed", {}).get("values", {})

    print("=" * 60)
    print("LOAD TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total requests:     {http_reqs.get('count', 'N/A')}")
    print(f"Request rate:       {http_reqs.get('rate', 0):.1f} req/s")
    print(f"Failure rate:       {http_fails.get('rate', 0) * 100:.2f}%")
    print()
    print("Response times (ms):")
    print(f"  Average:  {ms(http_dur.get('avg', 0))}")
    print(f"  Median:   {ms(http_dur.get('med', 0))}")
    print(f"  p(90):    {ms(http_dur.get('p(90)', 0))}")
    print(f"  p(95):    {ms(http_dur.get('p(95)', 0))}")
    print(f"  p(99):    {ms(http_dur.get('p(99)', 0))}")
    print(f"  Max:      {ms(http_dur.get('max', 0))}")
    print()

    # Custom metrics
    custom = ["login_duration", "profile_duration",
              "languages_duration", "learning_path_duration"]
    labels = {
        "login_duration": "POST /auth/login",
        "profile_duration": "GET /user/me",
        "languages_duration": "GET /languages",
        "learning_path_duration": "GET /learning-path",
    }

    print("Per-endpoint response times (ms):")
    print(f"  {'Endpoint':<25} {'Avg':>8} {'Med':>8} {'p95':>8} {'p99':>8} {'Max':>8}")
    print("  " + "-" * 65)
    for m in custom:
        vals = metrics.get(m, {}).get("values", {})
        if vals:
            print(
                f"  {labels[m]:<25} "
                f"{ms(vals.get('avg', 0)):>8} "
                f"{ms(vals.get('med', 0)):>8} "
                f"{ms(vals.get('p(95)', 0)):>8} "
                f"{ms(vals.get('p(99)', 0)):>8} "
                f"{ms(vals.get('max', 0)):>8}"
            )
    print()

    # LaTeX table output
    print("=" * 60)
    print("LATEX TABLE (copy into thesis)")
    print("=" * 60)
    print(r"\begin{table}[htbp]")
    print(r"    \centering")
    print(r"    \begin{tabular}{lccccc}")
    print(r"        \toprule")
    print(r"        \textbf{Endpoint} & \textbf{Avg (ms)} & \textbf{Median} & \textbf{p95} & \textbf{p99} & \textbf{Max} \\")
    print(r"        \midrule")
    for m in custom:
        vals = metrics.get(m, {}).get("values", {})
        if vals:
            print(
                f"        {labels[m]} & "
                f"{ms(vals.get('avg', 0))} & "
                f"{ms(vals.get('med', 0))} & "
                f"{ms(vals.get('p(95)', 0))} & "
                f"{ms(vals.get('p(99)', 0))} & "
                f"{ms(vals.get('max', 0))} \\\\"
            )
    print(r"        \midrule")
    print(
        f"        Overall & "
        f"{ms(http_dur.get('avg', 0))} & "
        f"{ms(http_dur.get('med', 0))} & "
        f"{ms(http_dur.get('p(95)', 0))} & "
        f"{ms(http_dur.get('p(99)', 0))} & "
        f"{ms(http_dur.get('max', 0))} \\\\"
    )
    print(r"        \bottomrule")
    print(r"    \end{tabular}")
    total = int(http_reqs.get("count", 0))
    rate = http_reqs.get("rate", 0)
    fail = http_fails.get("rate", 0) * 100
    print(
        f"    \\caption{{Load test results: {total} total requests at "
        f"{rate:.1f} req/s, {fail:.1f}\\% error rate. "
        f"Peak concurrency: 50 virtual users.}}"
    )
    print(r"    \label{tab:load_test}")
    print(r"\end{table}")


if __name__ == "__main__":
    main()
