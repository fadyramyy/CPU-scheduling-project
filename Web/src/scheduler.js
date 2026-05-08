export function runRoundRobin(processes, quantum) {
    const n = processes.length;
    const remaining = {};
    processes.forEach(p => remaining[p.pid] = p.bt);
    
    const firstRun = {};
    const finish = {};
    const gantt = [];
    const trace = [];
    
    const queue = [];
    const inQueue = new Set();
    const arrived = new Set();
    let t = 0;
    
    // Sort processes by arrival time, then PID (to match Python behavior)
    const procsByAt = [...processes].sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return a.pid.localeCompare(b.pid);
    });

    function enqueueArrivals(time) {
        for (const p of procsByAt) {
            if (!arrived.has(p.pid) && p.at <= time && !inQueue.has(p.pid) && remaining[p.pid] > 0) {
                queue.push(p.pid);
                inQueue.add(p.pid);
                arrived.add(p.pid);
            }
        }
    }

    enqueueArrivals(t);

    if (queue.length === 0) {
        if (procsByAt.length > 0) {
            t = procsByAt[0].at;
            enqueueArrivals(t);
        }
    }

    let guard = 0;
    while (queue.length > 0 && guard < 100000) {
        guard++;
        const pid = queue.shift();
        inQueue.delete(pid);
        
        const p = processes.find(x => x.pid === pid);
        
        // Record trace BEFORE execution
        trace.push({
            time: t,
            running: pid,
            queueSnapshot: [...queue]
        });

        if (!(pid in firstRun)) {
            firstRun[pid] = t;
        }

        const run = Math.min(remaining[pid], quantum);
        gantt.push({ pid, start: t, end: t + run });
        
        t += run;
        remaining[pid] -= run;

        enqueueArrivals(t);

        if (remaining[pid] > 0) {
            queue.push(pid);
            inQueue.add(pid);
        } else {
            finish[pid] = t;
        }

        if (queue.length === 0) {
            const pending = processes.filter(x => remaining[x.pid] > 0 && !inQueue.has(x.pid));
            if (pending.length > 0) {
                const nextAt = Math.min(...pending.map(x => x.at));
                if (nextAt > t) {
                    t = nextAt;
                }
                enqueueArrivals(t);
            }
        }
    }

    const results = processes.map(p => {
        const ft = finish[p.pid];
        const wt = ft - p.at - p.bt;
        const tat = ft - p.at;
        const rt = firstRun[p.pid] - p.at;
        return {
            pid: p.pid,
            at: p.at,
            bt: p.bt,
            ft,
            wt,
            tat,
            rt
        };
    });

    return { results, gantt, trace };
}

export function runSJF(processes) {
    const done = new Set();
    const results = [];
    const gantt = [];
    let t = 0;

    for (let i = 0; i < processes.length; i++) {
        let available = processes.filter(p => p.at <= t && !done.has(p.pid));

        if (available.length === 0) {
            const remainingProcs = processes.filter(p => !done.has(p.pid));
            if (remainingProcs.length === 0) break;
            
            // Find next arrival time
            let nextP = remainingProcs[0];
            for (const p of remainingProcs) {
                if (p.at < nextP.at || (p.at === nextP.at && p.pid.localeCompare(nextP.pid) < 0)) {
                    nextP = p;
                }
            }
            t = nextP.at;
            available = processes.filter(p => p.at <= t && !done.has(p.pid));
        }

        // Tie-breaking: BT -> AT -> PID
        let chosen = available[0];
        for (const p of available) {
            if (p.bt < chosen.bt) {
                chosen = p;
            } else if (p.bt === chosen.bt) {
                if (p.at < chosen.at) {
                    chosen = p;
                } else if (p.at === chosen.at) {
                    if (p.pid.localeCompare(chosen.pid) < 0) {
                        chosen = p;
                    }
                }
            }
        }

        const start = t;
        t += chosen.bt;
        gantt.push({ pid: chosen.pid, start, end: t });

        const wt = start - chosen.at;
        const tat = t - chosen.at;
        const rt = start - chosen.at;

        results.push({
            pid: chosen.pid,
            at: chosen.at,
            bt: chosen.bt,
            ft: t,
            wt,
            tat,
            rt
        });
        done.add(chosen.pid);
    }

    return { results, gantt };
}

export function calculateAverages(results) {
    if (!results || results.length === 0) return { wt: 0, tat: 0, rt: 0 };
    const n = results.length;
    const avgWt = results.reduce((acc, curr) => acc + curr.wt, 0) / n;
    const avgTat = results.reduce((acc, curr) => acc + curr.tat, 0) / n;
    const avgRt = results.reduce((acc, curr) => acc + curr.rt, 0) / n;
    return { wt: avgWt, tat: avgTat, rt: avgRt };
}
