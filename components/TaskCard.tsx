
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleTimer: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleTimer, onComplete, onDelete, onReset }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isRunning = task.status === TaskStatus.RUNNING;

  const formatTime = (seconds: number) => {
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs.toString().padStart(2, '0')}s`);

    return parts.join(' ');
  };

  const formatSegmentLabel = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0 && mins === 0) return `${hrs}h`;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Generate chunks of time
  const HOUR_IN_SECONDS = 3600;
  const segments: { duration: number; start: number; end: number; label: string }[] = [];

  let remaining = task.targetDuration;
  let currentStart = 0;

  while (remaining > 0) {
    const chunkDuration = Math.min(remaining, HOUR_IN_SECONDS);
    segments.push({
      duration: chunkDuration,
      start: currentStart,
      end: currentStart + chunkDuration,
      label: formatSegmentLabel(chunkDuration)
    });
    currentStart += chunkDuration;
    remaining -= chunkDuration;
  }

  // Find current active segment
  const currentSegmentIndex = segments.findIndex(s => task.elapsedSeconds >= s.start && task.elapsedSeconds < s.end);
  const activeSegment = currentSegmentIndex !== -1 ? segments[currentSegmentIndex] : (task.elapsedSeconds >= task.targetDuration ? segments[segments.length - 1] : segments[0]);

  const secondsIntoActiveSegment = Math.max(0, task.elapsedSeconds - (activeSegment?.start || 0));
  const activeSegmentProgress = activeSegment ? Math.min((secondsIntoActiveSegment / activeSegment.duration) * 100, 100) : 100;

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all duration-300 ${isCompleted ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-lg hover:-translate-y-1'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 mr-4">
          <h3 className={`text-xl font-bold text-gray-900 leading-tight ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {task.description}
          </p>
        </div>

        <div className="relative">
          {showConfirmDelete ? (
            <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
              <button
                onClick={() => onDelete(task.id)}
                className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                title="Confirm Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-100 text-gray-500 p-2 rounded-xl hover:bg-gray-200 transition-colors"
                title="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-gray-300 hover:text-red-500 transition-colors p-2"
              title="Delete Task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Time Phases Visualization */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[11px] uppercase tracking-widest font-black text-gray-400">Time Phases</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {isCompleted ? 'All Phases Completed' : `Phase ${Math.min(currentSegmentIndex + 1, segments.length)}: ${activeSegment?.label || ''}`}
            </span>
          </div>

          <div className="flex gap-1.5 h-4">
            {segments.map((seg, i) => {
              let segmentFill = 0;
              if (task.elapsedSeconds >= seg.end) segmentFill = 100;
              else if (task.elapsedSeconds >= seg.start && task.elapsedSeconds < seg.end) {
                segmentFill = ((task.elapsedSeconds - seg.start) / seg.duration) * 100;
              }

              return (
                <div
                  key={i}
                  className="bg-gray-100 rounded-full overflow-hidden relative group"
                  style={{ flex: seg.duration }}
                  title={`Phase ${i + 1}: ${seg.label}`}
                >
                  <div
                    className={`h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500' : 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]'}`}
                    style={{ width: `${segmentFill}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[9px] font-black text-gray-300 px-0.5">
            {segments.map((seg, i) => (
              <span key={i} style={{ flex: seg.duration }} className="text-center">{seg.label}</span>
            ))}
          </div>
        </div>

        {/* Current Active Phase Context */}
        {!isCompleted && activeSegment && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-gray-500">Active Phase: {activeSegment.label}</span>
              <span className="text-[10px] font-bold text-indigo-700">{Math.round(activeSegmentProgress)}%</span>
            </div>
            <div className="w-full bg-white h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 transition-all duration-1000"
                style={{ width: `${activeSegmentProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium flex justify-between">
              <span>Remaining in phase:</span>
              <span className="font-bold text-gray-600">{formatTime(Math.max(0, activeSegment.duration - secondsIntoActiveSegment))}</span>
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-between items-center px-2 bg-gray-50/50 py-3 rounded-2xl border border-dashed border-gray-200">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black text-gray-400">Total Elapsed</span>
            <span className="text-sm font-mono font-bold text-gray-800">{formatTime(task.elapsedSeconds)}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-black text-gray-400">Total Goal</span>
            <span className="text-sm font-mono font-bold text-gray-800">{formatTime(task.targetDuration)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          {!isCompleted ? (
            <>
              <button
                onClick={() => onToggleTimer(task.id)}
                className={`flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95 ${isRunning
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-900 text-white hover:bg-black'
                  }`}
              >
                {isRunning ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> Pause</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start Session</>
                )}
              </button>
              <button
                onClick={() => onComplete(task.id)}
                className="flex-1 flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                title="Finish Task"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => onReset(task.id)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              Restart Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
