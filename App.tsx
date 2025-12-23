
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, TaskMode } from './types';
import TaskCard from './components/TaskCard';
import { refineTaskDescription, suggestDuration } from './services/geminiService';

const STORAGE_KEY = 'focusflow_tasks_data_v2';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newHours, setNewHours] = useState('0');
  const [newMinutes, setNewMinutes] = useState('25');
  const [newLearnHours, setNewLearnHours] = useState('0');
  const [newLearnMinutes, setNewLearnMinutes] = useState('60');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hydrated = parsed.map((t: any): Task => {
          // Migration logic: support old format and add new fields if missing
          return {
            ...t,
            status: t.status === TaskStatus.RUNNING ? TaskStatus.PAUSED : t.status,
            activeMode: t.activeMode || TaskMode.FOCUS,
            focusElapsed: t.focusElapsed ?? t.elapsedSeconds ?? 0,
            learnElapsed: t.learnElapsed ?? 0,
            learnTargetDuration: t.learnTargetDuration ?? 3600, // Default 1 hour for learning
          };
        });
        setTasks(hydrated);
      } catch (e) {
        console.error("Failed to parse stored tasks", e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Timer Tick Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        const now = Date.now();
        let hasChanges = false;

        const nextTasks = prevTasks.map(task => {
          if (task.status === TaskStatus.RUNNING) {
            hasChanges = true;

            const lastTick = task.lastProceededAt || now;
            const delta = (now - lastTick) / 1000;
            if (delta < 0.1) return task;

            const isFocus = task.activeMode === TaskMode.FOCUS;
            const currentElapsed = isFocus ? task.focusElapsed : task.learnElapsed;
            const target = isFocus ? task.targetDuration : task.learnTargetDuration;

            const newElapsed = currentElapsed + delta;

            if (newElapsed >= target) {
              return {
                ...task,
                [isFocus ? 'focusElapsed' : 'learnElapsed']: target,
                status: TaskStatus.COMPLETED,
                lastProceededAt: undefined
              };
            }

            return {
              ...task,
              [isFocus ? 'focusElapsed' : 'learnElapsed']: newElapsed,
              lastProceededAt: now
            };
          }
          return task;
        });
        return hasChanges ? nextTasks : prevTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const totalSeconds = (parseInt(newHours) * 3600) + (parseInt(newMinutes) * 60);
    const learnTotalSeconds = (parseInt(newLearnHours) * 3600) + (parseInt(newLearnMinutes) * 60);
    if (totalSeconds <= 0 && learnTotalSeconds <= 0) return;

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTitle,
      description: newDesc || 'No description provided.',
      targetDuration: totalSeconds,
      focusElapsed: 0,
      learnTargetDuration: learnTotalSeconds || 3600,
      learnElapsed: 0,
      activeMode: TaskMode.FOCUS,
      status: TaskStatus.PENDING,
      createdAt: Date.now()
    };

    setTasks(prev => [task, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewHours('0');
    setNewMinutes('25');
    setNewLearnHours('0');
    setNewLearnMinutes('60');
    setIsAdding(false);
  };

  const handleAiOptimize = async () => {
    if (!newTitle) return;
    setIsAiLoading(true);
    try {
      const [refinedDesc, suggestedMins] = await Promise.all([
        refineTaskDescription(newTitle, newDesc),
        suggestDuration(newTitle)
      ]);
      setNewDesc(refinedDesc || newDesc);

      const h = Math.floor(suggestedMins / 60);
      const m = suggestedMins % 60;
      setNewHours(h.toString());
      setNewMinutes(m.toString());
    } catch (err) {
      console.error("AI Optimization failed", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleTimer = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.status === TaskStatus.RUNNING) {
          // Pausing: clear the timestamp
          return { ...t, status: TaskStatus.PAUSED, lastProceededAt: undefined };
        } else {
          // Resuming: set the timestamp
          return { ...t, status: TaskStatus.RUNNING, lastProceededAt: Date.now() };
        }
      }
      return t.status === TaskStatus.RUNNING ? { ...t, status: TaskStatus.PAUSED, lastProceededAt: undefined } : t;
    }));
  };

  const markComplete = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        status: TaskStatus.COMPLETED,
        focusElapsed: t.activeMode === TaskMode.FOCUS ? t.targetDuration : t.focusElapsed,
        learnElapsed: t.activeMode === TaskMode.LEARN ? t.learnTargetDuration : t.learnElapsed
      } : t
    ));
  };

  const toggleMode = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newMode = t.activeMode === TaskMode.FOCUS ? TaskMode.LEARN : TaskMode.FOCUS;
        // When swapping modes, we pause the timer to ensure accurate transition
        return {
          ...t,
          activeMode: newMode,
          status: TaskStatus.PAUSED,
          lastProceededAt: undefined
        };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const resetTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        status: TaskStatus.PENDING,
        focusElapsed: 0,
        learnElapsed: 0,
        lastProceededAt: undefined
      } : t
    ));
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    running: tasks.find(t => t.status === TaskStatus.RUNNING)
  };

  return (
    <div className="min-h-screen pb-24 bg-[#F8FAFC]">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">FocusFlow</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Productivity Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Session Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${(stats.completed / (stats.total || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black text-gray-700">{stats.completed}/{stats.total}</span>
              </div>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Task
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {stats.running && (
          <div className="mb-10 p-5 bg-indigo-600 rounded-[2rem] flex items-center justify-between text-white shadow-2xl shadow-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-spin-slow">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Active Focus Session</p>
                <h2 className="text-lg font-black">{stats.running.title}</h2>
              </div>
            </div>
            <button
              onClick={() => toggleTimer(stats.running!.id)}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all active:scale-95"
            >
              Pause Flow
            </button>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 text-gray-200 shadow-sm border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900">Your flow is empty</h2>
            <p className="text-gray-400 mt-2 max-w-sm font-medium">Break down your day into focused hour-blocks. Add your first task to begin.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-8 text-indigo-600 font-bold flex items-center gap-2 hover:gap-3 transition-all px-8 py-4 bg-white rounded-2xl border border-indigo-100 shadow-sm"
            >
              Create your first card
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleTimer={toggleTimer}
                onToggleMode={toggleMode}
                onComplete={markComplete}
                onDelete={deleteTask}
                onReset={resetTask}
              />
            ))}
          </div>
        )}
      </main>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            onClick={() => !isAiLoading && setIsAdding(false)}
          ></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 relative shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Create Task</h2>
                <p className="text-sm text-gray-400 font-medium">Set your goals and duration</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="bg-gray-50 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Goal Title</label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g., Deep Work: Product Design"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-gray-800"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Context & Details</label>
                  <button
                    type="button"
                    onClick={handleAiOptimize}
                    disabled={!newTitle || isAiLoading}
                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm ${!newTitle || isAiLoading ? 'bg-gray-50 text-gray-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                  >
                    {isAiLoading ? 'Analyzing...' : <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> AI Refine</>}
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="What needs to get done?"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all resize-none font-medium text-gray-600"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Work Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold"
                    value={newHours}
                    onChange={e => setNewHours(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Work Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold"
                    value={newMinutes}
                    onChange={e => setNewMinutes(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Study Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    className="w-full px-5 py-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none font-bold"
                    value={newLearnHours}
                    onChange={e => setNewLearnHours(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Study Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="w-full px-5 py-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none font-bold"
                    value={newLearnMinutes}
                    onChange={e => setNewLearnMinutes(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isAiLoading}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg mt-4 hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                Create Goal Card
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
