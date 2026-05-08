"""
CPU Scheduling Simulator: Round Robin vs Shortest Job First (Non-Preemptive)
OS Course Project — Full Submission
"""

def get_valid_int(prompt, min_val=None, allow_zero=False):
    while True:
        raw = input(prompt).strip()
        if not raw:
            print("  [Error] Input cannot be empty.")
            continue
        try:
            val = int(raw)
        except ValueError:
            print("  [Error] Must be a whole number (no decimals, no letters).")
            continue
        if not allow_zero and min_val is not None and val < min_val:
            print(f"  [Error] Value must be >= {min_val}.")
            continue
        if allow_zero and min_val is not None and val < min_val:
            print(f"  [Error] Value must be >= {min_val}.")
            continue
        return val


def input_processes():
    print("\n" + "="*60)
    print("  PROCESS INPUT")
    print("="*60)
    n = get_valid_int("Enter number of processes (1-10): ", min_val=1)
    if n > 10:
        print("  [Error] Maximum 10 processes allowed.")
        return input_processes()

    processes = []
    pids = set()

    for i in range(n):
        print(f"\n  --- Process {i+1} ---")
        while True:
            pid = input("  Process ID (e.g. P1): ").strip()
            if not pid:
                print("  [Error] Process ID cannot be empty.")
                continue
            if pid in pids:
                print(f"  [Error] Duplicate Process ID '{pid}'. Use a unique ID.")
                continue
            pids.add(pid)
            break

        at = get_valid_int("  Arrival Time (>= 0): ", min_val=0, allow_zero=True)
        bt = get_valid_int("  Burst Time (>= 1): ", min_val=1)
        processes.append({"pid": pid, "at": at, "bt": bt})

    return processes


def input_quantum():
    print()
    return get_valid_int("Enter Time Quantum for Round Robin (>= 1): ", min_val=1)


# ─── Round Robin ────────────────────────────────────────────────────────────

def run_round_robin(processes, quantum):
    n = len(processes)
    remaining = {p["pid"]: p["bt"] for p in processes}
    first_run = {}
    finish = {}
    gantt = []
    t = 0
    queue = []
    in_queue = set()
    arrived = set()

    procs_sorted = sorted(processes, key=lambda p: p["at"])

    def enqueue_arrivals(time):
        for p in procs_sorted:
            if p["pid"] not in arrived and p["at"] <= time and p["pid"] not in in_queue and remaining[p["pid"]] > 0:
                queue.append(p["pid"])
                in_queue.add(p["pid"])
                arrived.add(p["pid"])

    enqueue_arrivals(t)
    if not queue:
        t = procs_sorted[0]["at"]
        enqueue_arrivals(t)

    iterations = 0
    while queue and iterations < 100000:
        iterations += 1
        pid = queue.pop(0)
        in_queue.discard(pid)
        p = next(x for x in processes if x["pid"] == pid)

        if pid not in first_run:
            first_run[pid] = t

        run = min(remaining[pid], quantum)
        gantt.append((pid, t, t + run))
        t += run
        remaining[pid] -= run

        enqueue_arrivals(t)

        if remaining[pid] > 0:
            queue.append(pid)
            in_queue.add(pid)
        else:
            finish[pid] = t

        if not queue and any(remaining[p["pid"]] > 0 for p in processes):
            unfinished = [p for p in processes if remaining[p["pid"]] > 0 and p["pid"] not in in_queue]
            if unfinished:
                next_at = min(p["at"] for p in unfinished)
                if next_at > t:
                    t = next_at
                enqueue_arrivals(t)

    results = []
    for p in processes:
        pid = p["pid"]
        wt = finish[pid] - p["at"] - p["bt"]
        tat = finish[pid] - p["at"]
        rt = first_run[pid] - p["at"]
        results.append({"pid": pid, "at": p["at"], "bt": p["bt"], "wt": wt, "tat": tat, "rt": rt, "ft": finish[pid]})
    return results, gantt


# ─── SJF Non-Preemptive ─────────────────────────────────────────────────────

def run_sjf(processes):
    n = len(processes)
    done = set()
    results = []
    gantt = []
    t = 0

    for _ in range(n):
        available = [p for p in processes if p["at"] <= t and p["pid"] not in done]
        if not available:
            next_p = min((p for p in processes if p["pid"] not in done), key=lambda x: x["at"])
            t = next_p["at"]
            available = [next_p]

        # Shortest burst; tie-break by arrival time then pid
        chosen = min(available, key=lambda p: (p["bt"], p["at"], p["pid"]))
        start = t
        t += chosen["bt"]
        gantt.append((chosen["pid"], start, t))
        wt = start - chosen["at"]
        tat = t - chosen["at"]
        rt = start - chosen["at"]  # non-preemptive: RT == WT
        results.append({"pid": chosen["pid"], "at": chosen["at"], "bt": chosen["bt"],
                        "wt": wt, "tat": tat, "rt": rt, "ft": t})
        done.add(chosen["pid"])

    return results, gantt


# ─── Display ─────────────────────────────────────────────────────────────────

def print_gantt(gantt, title):
    print(f"\n  Gantt Chart — {title}")
    bar = ""
    timeline = ""
    for pid, start, end in gantt:
        width = max(len(pid) + 2, (end - start) * 3)
        bar += f"|{pid.center(width)}"
        timeline += str(start).ljust(width + 1)
    bar += "|"
    timeline += str(gantt[-1][2])
    print("  " + bar)
    print("  " + timeline)


def print_metrics(results, title):
    print(f"\n  Metrics — {title}")
    header = f"  {'PID':<8} {'AT':>5} {'BT':>5} {'FT':>5} {'WT':>6} {'TAT':>6} {'RT':>6}"
    print(header)
    print("  " + "-" * 48)
    for r in results:
        print(f"  {r['pid']:<8} {r['at']:>5} {r['bt']:>5} {r['ft']:>5} {r['wt']:>6} {r['tat']:>6} {r['rt']:>6}")
    print("  " + "-" * 48)
    avg_wt  = sum(r["wt"]  for r in results) / len(results)
    avg_tat = sum(r["tat"] for r in results) / len(results)
    avg_rt  = sum(r["rt"]  for r in results) / len(results)
    print(f"  {'Average':<8} {'':>5} {'':>5} {'':>5} {avg_wt:>6.2f} {avg_tat:>6.2f} {avg_rt:>6.2f}")
    return avg_wt, avg_tat, avg_rt


def print_comparison(rr_avgs, sjf_avgs):
    print("\n" + "="*60)
    print("  COMPARISON SUMMARY — RR vs SJF (same workload)")
    print("="*60)
    labels = ["Avg Waiting Time", "Avg Turnaround Time", "Avg Response Time"]
    rr_vals  = [rr_avgs[0],  rr_avgs[1],  rr_avgs[2]]
    sjf_vals = [sjf_avgs[0], sjf_avgs[1], sjf_avgs[2]]

    print(f"\n  {'Metric':<22} {'Round Robin':>12} {'SJF':>12} {'Winner':>10}")
    print("  " + "-"*58)
    for label, rr, sjf in zip(labels, rr_vals, sjf_vals):
        if rr < sjf:
            winner = "RR"
        elif sjf < rr:
            winner = "SJF"
        else:
            winner = "Tie"
        print(f"  {label:<22} {rr:>12.2f} {sjf:>12.2f} {winner:>10}")

    print("\n  SCHEDULING ANALYSIS:")
    print("  - SJF minimizes average waiting time when all jobs are known upfront.")
    print("  - Round Robin ensures fairness — no process waits indefinitely (no starvation).")
    print("  - SJF can cause starvation for long processes if short jobs keep arriving.")
    print("  - Round Robin's performance depends heavily on the chosen time quantum.")
    print("  - RR has higher overhead due to frequent context switches.")
    print("  - SJF is optimal for batch systems; RR is preferred for time-sharing systems.")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "="*60)
    print("  CPU SCHEDULING SIMULATOR")
    print("  Round Robin vs Shortest Job First (Non-Preemptive)")
    print("="*60)

    processes = input_processes()
    quantum = input_quantum()

    print("\n" + "="*60)
    print("  ROUND ROBIN RESULTS")
    print("="*60)
    rr_results, rr_gantt = run_round_robin(processes, quantum)
    print_gantt(rr_gantt, f"Round Robin (Quantum = {quantum})")
    rr_avgs = print_metrics(rr_results, "Round Robin")

    print("\n" + "="*60)
    print("  SJF (NON-PREEMPTIVE) RESULTS")
    print("="*60)
    sjf_results, sjf_gantt = run_sjf(processes)
    print_gantt(sjf_gantt, "SJF Non-Preemptive")
    sjf_avgs = print_metrics(sjf_results, "SJF Non-Preemptive")

    print_comparison(rr_avgs, sjf_avgs)
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
