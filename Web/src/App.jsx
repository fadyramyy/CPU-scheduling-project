import { useState, useMemo } from 'react';
import { runRoundRobin, runSJF, calculateAverages } from './scheduler';
import { Play, Plus, Trash2, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';
import './index.css';

const SCENARIOS = {
  A: {
    name: "Basic Mixed",
    quantum: 3,
    processes: [
      { pid: "P1", at: 0, bt: 5 },
      { pid: "P2", at: 1, bt: 3 },
      { pid: "P3", at: 2, bt: 8 },
      { pid: "P4", at: 3, bt: 6 },
    ]
  },
  B: {
    name: "Short-job-heavy",
    quantum: 2,
    processes: [
      { pid: "P1", at: 0, bt: 10 },
      { pid: "P2", at: 1, bt: 2 },
      { pid: "P3", at: 2, bt: 1 },
      { pid: "P4", at: 3, bt: 1 },
      { pid: "P5", at: 4, bt: 2 }
    ]
  },
  C: {
    name: "Fairness (Equal BT)",
    quantum: 4,
    processes: [
      { pid: "P1", at: 0, bt: 8 },
      { pid: "P2", at: 0, bt: 8 },
      { pid: "P3", at: 0, bt: 8 },
      { pid: "P4", at: 0, bt: 8 }
    ]
  },
  D: {
    name: "Long-job sensitivity",
    quantum: 5,
    processes: [
      { pid: "P1", at: 0, bt: 20 },
      { pid: "P2", at: 2, bt: 2 },
      { pid: "P3", at: 4, bt: 2 },
      { pid: "P4", at: 6, bt: 2 }
    ]
  },
  E: {
    name: "Validation Case (Invalid)",
    quantum: 0,
    processes: [
      { pid: "P1", at: -1, bt: 5 },
      { pid: "P1", at: 0, bt: 0 },
      { pid: "", at: 2, bt: -2 }
    ]
  }
};

const COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F43F5E', '#84CC16', '#64748B', '#D946EF'
];

function App() {
  const [processes, setProcesses] = useState([{ pid: "P1", at: 0, bt: 5 }]);
  const [quantum, setQuantum] = useState(3);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [results, setResults] = useState(null);

  const getColor = (pid) => {
    let hash = 0;
    for (let i = 0; i < pid.length; i++) {
      hash = pid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  const handleAddProcess = () => {
    const nextId = processes.length + 1;
    setProcesses([...processes, { pid: `P${nextId}`, at: 0, bt: 1 }]);
    setHasRun(false);
  };

  const handleRemoveProcess = (index) => {
    const newProcesses = [...processes];
    newProcesses.splice(index, 1);
    setProcesses(newProcesses);
    setHasRun(false);
  };

  const handleProcessChange = (index, field, value) => {
    const newProcesses = [...processes];
    newProcesses[index][field] = value;
    setProcesses(newProcesses);
    setHasRun(false);
  };

  const loadScenario = (key) => {
    const scenario = SCENARIOS[key];
    setProcesses(JSON.parse(JSON.stringify(scenario.processes)));
    setQuantum(scenario.quantum);
    setHasRun(false);
    setError('');
  };

  const validate = () => {
    if (processes.length === 0) return "Please add at least one process.";
    if (quantum <= 0 || isNaN(quantum)) return "Time quantum must be a positive number > 0.";
    
    const pids = new Set();
    for (let i = 0; i < processes.length; i++) {
      const p = processes[i];
      if (!p.pid || p.pid.trim() === '') return `Process at row ${i+1} has an empty PID.`;
      if (pids.has(p.pid)) return `Duplicate Process ID found: '${p.pid}'.`;
      pids.add(p.pid);

      const at = parseInt(p.at);
      const bt = parseInt(p.bt);

      if (isNaN(at) || at < 0) return `Process ${p.pid} has an invalid Arrival Time (must be >= 0).`;
      if (isNaN(bt) || bt <= 0) return `Process ${p.pid} has an invalid Burst Time (must be > 0).`;
      
      // Update with parsed integers just in case
      processes[i].at = at;
      processes[i].bt = bt;
    }
    return null;
  };

  const handleRun = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setHasRun(false);
      return;
    }
    setError('');

    const rr = runRoundRobin(processes, parseInt(quantum));
    const sjf = runSJF(processes);

    const rrAvgs = calculateAverages(rr.results);
    const sjfAvgs = calculateAverages(sjf.results);

    setResults({ rr, sjf, rrAvgs, sjfAvgs });
    setHasRun(true);
  };

  const renderGantt = (ganttData) => {
    if (!ganttData || ganttData.length === 0) return null;
    const totalTime = ganttData[ganttData.length - 1].end - ganttData[0].start;
    
    return (
      <div className="gantt-chart">
        {ganttData.map((block, i) => {
          const width = Math.max(5, ((block.end - block.start) / totalTime) * 100);
          return (
            <div 
              key={i} 
              className="gantt-block" 
              style={{ width: `${width}%`, backgroundColor: getColor(block.pid) }}
              title={`[${block.start} - ${block.end}] ${block.pid}`}
            >
              {block.pid}
              {i === 0 && <span className="gantt-time">{block.start}</span>}
              <span className="gantt-time end">{block.end}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = (data, avgs) => {
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>PID</th>
              <th>AT</th>
              <th>BT</th>
              <th>FT</th>
              <th>WT</th>
              <th>TAT</th>
              <th>RT</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td><strong>{r.pid}</strong></td>
                <td>{r.at}</td>
                <td>{r.bt}</td>
                <td>{r.ft}</td>
                <td>{r.wt}</td>
                <td>{r.tat}</td>
                <td>{r.rt}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: 'var(--background)' }}>
              <td><strong>Average</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td><strong>{avgs.wt.toFixed(2)}</strong></td>
              <td><strong>{avgs.tat.toFixed(2)}</strong></td>
              <td><strong>{avgs.rt.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const getWinner = (rrVal, sjfVal) => {
    if (rrVal < sjfVal) return { winner: 'RR', diff: (sjfVal - rrVal).toFixed(2) };
    if (sjfVal < rrVal) return { winner: 'SJF', diff: (rrVal - sjfVal).toFixed(2) };
    return { winner: 'Tie', diff: '0' };
  };

  return (
    <div className="container">
      <header className="header">
        <h1>CPU Scheduling Simulator</h1>
        <p>Round Robin vs Shortest Job First</p>
      </header>

      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div className="scenarios" style={{ marginBottom: 0 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem', alignSelf: 'center', marginRight: '0.5rem' }}>Test Scenarios:</span>
          {Object.entries(SCENARIOS).map(([key, sc]) => (
            <button key={key} className="btn btn-outline scenario-btn" onClick={() => loadScenario(key)}>
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="layout-grid">
        <div className="left-column">
          <div className="card">
          <h2 className="card-title"><Clock className="w-5 h-5" /> Input Panel</h2>
          
          {error && (
            <div className="alert flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="form-group" style={{ maxWidth: '200px', marginBottom: '1.5rem' }}>
            <label>Time Quantum (Round Robin)</label>
            <input 
              type="number" 
              value={quantum} 
              onChange={(e) => { setQuantum(e.target.value); setHasRun(false); }} 
              min="1"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Quantum must be a positive integer.</span>
          </div>

          <div className="table-container" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Process ID</th>
                  <th>Arrival Time</th>
                  <th>Burst Time</th>
                  <th style={{ width: '60px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <input type="text" value={p.pid} onChange={(e) => handleProcessChange(i, 'pid', e.target.value)} style={{ width: '100%' }} />
                    </td>
                    <td>
                      <input type="number" value={p.at} onChange={(e) => handleProcessChange(i, 'at', e.target.value)} style={{ width: '100%' }} />
                    </td>
                    <td>
                      <input type="number" value={p.bt} onChange={(e) => handleProcessChange(i, 'bt', e.target.value)} style={{ width: '100%' }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleRemoveProcess(i)} title="Remove Process">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button className="btn btn-secondary" onClick={handleAddProcess}>
              <Plus className="w-4 h-4" /> Add Process
            </button>
            <button className="btn btn-primary flex-grow" onClick={handleRun}>
              <Play className="w-4 h-4" /> Run Simulation
            </button>
          </div>
        </div>
        </div>

        <div className="right-column">
          {!hasRun || !results ? (
            <div className="card placeholder-card">
              <p>Run a simulation to view Gantt charts, metrics, and comparison summary.</p>
            </div>
          ) : (
            <>
              <div className="card conclusion">
            <h2 className="card-title"><CheckCircle className="w-5 h-5" /> Conclusion</h2>
            {(() => {
              const rrScore = (results.rrAvgs.wt < results.sjfAvgs.wt ? 1 : 0) +
                              (results.rrAvgs.tat < results.sjfAvgs.tat ? 1 : 0) +
                              (results.rrAvgs.rt < results.sjfAvgs.rt ? 1 : 0);
              const sjfScore = (results.sjfAvgs.wt < results.rrAvgs.wt ? 1 : 0) +
                               (results.sjfAvgs.tat < results.rrAvgs.tat ? 1 : 0) +
                               (results.sjfAvgs.rt < results.rrAvgs.rt ? 1 : 0);
              
              let overall = "Neither (Tie)";
              if (sjfScore > rrScore) overall = "SJF (Non-Preemptive)";
              if (rrScore > sjfScore) overall = "Round Robin";

              return (
                <>
                  <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                    Overall better algorithm for this workload: <strong>{overall}</strong>
                  </p>
                  <table style={{ marginBottom: '1rem', backgroundColor: 'var(--surface)' }}>
                    <thead>
                      <tr>
                        <th>Criterion</th>
                        <th>Round Robin</th>
                        <th>SJF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Avg Waiting Time</td>
                        <td style={{ color: results.rrAvgs.wt <= results.sjfAvgs.wt ? 'var(--secondary)' : 'inherit', fontWeight: results.rrAvgs.wt <= results.sjfAvgs.wt ? 'bold' : 'normal'}}>{results.rrAvgs.wt.toFixed(2)}</td>
                        <td style={{ color: results.sjfAvgs.wt <= results.rrAvgs.wt ? 'var(--secondary)' : 'inherit', fontWeight: results.sjfAvgs.wt <= results.rrAvgs.wt ? 'bold' : 'normal'}}>{results.sjfAvgs.wt.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Avg TAT</td>
                        <td style={{ color: results.rrAvgs.tat <= results.sjfAvgs.tat ? 'var(--secondary)' : 'inherit', fontWeight: results.rrAvgs.tat <= results.sjfAvgs.tat ? 'bold' : 'normal'}}>{results.rrAvgs.tat.toFixed(2)}</td>
                        <td style={{ color: results.sjfAvgs.tat <= results.rrAvgs.tat ? 'var(--secondary)' : 'inherit', fontWeight: results.sjfAvgs.tat <= results.rrAvgs.tat ? 'bold' : 'normal'}}>{results.sjfAvgs.tat.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Avg Response Time</td>
                        <td style={{ color: results.rrAvgs.rt <= results.sjfAvgs.rt ? 'var(--secondary)' : 'inherit', fontWeight: results.rrAvgs.rt <= results.sjfAvgs.rt ? 'bold' : 'normal'}}>{results.rrAvgs.rt.toFixed(2)}</td>
                        <td style={{ color: results.sjfAvgs.rt <= results.rrAvgs.rt ? 'var(--secondary)' : 'inherit', fontWeight: results.sjfAvgs.rt <= results.rrAvgs.rt ? 'bold' : 'normal'}}>{results.sjfAvgs.rt.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Starvation</td>
                        <td><span className="badge badge-success">None</span></td>
                        <td><span className="badge badge-danger">Possible</span></td>
                      </tr>
                      <tr>
                        <td>Fairness</td>
                        <td><span className="badge badge-success">High</span></td>
                        <td><span className="badge badge-danger">Low</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                    <strong>Recommendation:</strong> Use Round Robin for interactive/time-sharing systems where responsiveness and fairness are critical. Use SJF for batch processing environments where burst times are known in advance and minimizing total completion time is the goal.
                  </p>
                </>
              );
            })()}
          </div>

          <div className="card">
            <h2 className="card-title">Round Robin Results (Quantum = {quantum})</h2>
            
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Gantt Chart</h3>
            {renderGantt(results.rr.gantt)}
            
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Metrics Table</h3>
            {renderTable(results.rr.results, results.rrAvgs)}

            <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Ready Queue Trace</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
              {results.rr.trace.map((step, i) => (
                <div key={i} className="trace-step">
                  <div>
                    <span className="trace-time">Time {step.time.toString().padStart(3, '0')}</span> 
                    <span style={{ marginLeft: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>Running → {step.running}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Queue: {step.queueSnapshot.length > 0 ? step.queueSnapshot.join(', ') : '(empty)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">SJF Non-Preemptive Results</h2>
            
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Gantt Chart</h3>
            {renderGantt(results.sjf.gantt)}
            
            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Metrics Table</h3>
            {renderTable(results.sjf.results, results.sjfAvgs)}
          </div>

          <div className="card">
            <h2 className="card-title"><Info className="w-5 h-5" /> Dynamic Comparison Summary</h2>
            
            <div className="metrics-comparison">
              {['wt', 'tat', 'rt'].map(metric => {
                const w = getWinner(results.rrAvgs[metric], results.sjfAvgs[metric]);
                const labels = { wt: 'Waiting Time', tat: 'Turnaround Time', rt: 'Response Time' };
                return (
                  <div key={metric} className={`metric-card ${w.winner !== 'Tie' ? 'winner' : ''}`}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Avg {labels[metric]}</div>
                    <div className="metric-value">
                      RR: {results.rrAvgs[metric].toFixed(2)} <br/>
                      SJF: {results.sjfAvgs[metric].toFixed(2)}
                    </div>
                    <div className="winner-label">
                      {w.winner === 'Tie' ? 'Tie' : `${w.winner} wins by ${w.diff}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Analysis Details</h3>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                {results.sjfAvgs.wt < results.rrAvgs.wt && (
                  <li><strong>SJF minimizes Waiting Time</strong> by draining the shortest jobs first, reducing queue wait for subsequent processes.</li>
                )}
                {results.rrAvgs.wt < results.sjfAvgs.wt && (
                  <li><strong>RR minimizes Waiting Time</strong> evenly distributing CPU time, preventing long waits for the given quantum.</li>
                )}
                {results.rrAvgs.tat < results.sjfAvgs.tat ? (
                  <li><strong>RR has better Turnaround Time</strong> because short processes finished early pulling the average down.</li>
                ) : results.sjfAvgs.tat < results.rrAvgs.tat ? (
                  <li><strong>SJF has better Turnaround Time</strong> as it inherently minimizes WT, meaning processes complete sooner.</li>
                ) : null}
                {results.rrAvgs.rt < results.sjfAvgs.rt && (
                  <li><strong>RR ensures lower Response Time</strong> since every process gets CPU access within its first quantum cycle, bounded by (N-1)*Q.</li>
                )}
                <li><strong>Context Switches:</strong> Round Robin inherently performs more context switches due to preemption, while SJF performs exactly {processes.length} switches.</li>
              </ul>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
