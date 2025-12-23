import React, { useState } from 'react';
import { Task, TaskStatus, TaskMode } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleTimer: (id: string) => void;
  onToggleMode: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleTimer, onToggleMode, onComplete, onDelete, onReset }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isRunning = task.status === TaskStatus.RUNNING;
  const isLearnMode = task.activeMode === TaskMode.LEARN;

  const currentElapsed = isLearnMode ? task.learnElapsed : task.focusElapsed;
  const currentTarget = isLearnMode ? task.learnTargetDuration : task.targetDuration;

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

  let remaining = currentTarget;
  let currentStart = 0;

  while (remaining > 0) {
    const chunkDuration = Math.min(remaining, HOUR_IN_SECONDS);
    const hrs = Math.floor(chunkDuration / 3600);
    const mins = Math.floor((chunkDuration % 3600) / 60);
    let label = `${mins}m`;
    if (hrs > 0) label = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;

    segments.push({
      duration: chunkDuration,
      start: currentStart,
      end: currentStart + chunkDuration,
      label
    });
    currentStart += chunkDuration;
    remaining -= chunkDuration;
  }

  // Find current active segment
  const currentSegmentIndex = segments.findIndex(s => currentElapsed >= s.start && currentElapsed < s.end);
  const activeSegment = currentSegmentIndex !== -1 ? segments[currentSegmentIndex] : (currentElapsed >= currentTarget ? segments[segments.length - 1] : segments[0]);

  const secondsIntoActiveSegment = Math.max(0, currentElapsed - (activeSegment?.start || 0));
  const activeSegmentProgress = activeSegment ? Math.min((secondsIntoActiveSegment / activeSegment.duration) * 100, 100) : 100;

  const themeColor = isLearnMode ? 'emerald' : 'indigo';
  const themeBg = isLearnMode ? 'bg-emerald-600' : 'bg-indigo-600';
  const themeLightBg = isLearnMode ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600';
  const themeShadow = isLearnMode ? 'shadow-emerald-100' : 'shadow-indigo-100';

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all duration-300 ${isCompleted ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-lg hover:-translate-y-1'} ${isLearnMode ? 'ring-2 ring-emerald-500/20' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${themeLightBg}`}>
              {isLearnMode ? 'Learning Mode' : 'Focus Mode'}
            </span>
          </div>
          <h3 className={`text-xl font-bold text-gray-900 leading-tight ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>
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

      {/* Mode Swapper */}
      {!isCompleted && (
        <div className="flex p-1 bg-gray-50 rounded-xl mb-6">
          <button
            onClick={() => isLearnMode && onToggleMode(task.id)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${!isLearnMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Work
          </button>
          <button
            onClick={() => !isLearnMode && onToggleMode(task.id)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${isLearnMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Study/Learn
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Time Phases Visualization */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[11px] uppercase tracking-widest font-black text-gray-400">{isLearnMode ? 'Learning Phases' : 'Work Phases'}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${themeLightBg}`}>
              {isCompleted ? 'Complete' : `Phase ${Math.min(currentSegmentIndex + 1, segments.length)}: ${activeSegment?.label || ''}`}
            </span>
          </div>

          <div className="flex gap-1.5 h-4">
            {segments.map((seg, i) => {
              let segmentFill = 0;
              if (currentElapsed >= seg.end) segmentFill = 100;
              else if (currentElapsed >= seg.start && currentElapsed < seg.end) {
                segmentFill = ((currentElapsed - seg.start) / seg.duration) * 100;
              }

              return (
                <div
                  key={i}
                  className="bg-gray-100 rounded-full overflow-hidden relative group"
                  style={{ flex: seg.duration }}
                  title={`Phase ${i + 1}: ${seg.label}`}
                >
                  <div
                    className={`h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500' : themeBg + ' shadow-[0_0_8px_rgba(0,0,0,0.1)]'}`}
                    style={{ width: `${segmentFill}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Context */}
        {!isCompleted && activeSegment && (
          <div className={`${isLearnMode ? 'bg-emerald-50/30' : 'bg-gray-50'} rounded-2xl p-4 border border-gray-100/50`}>
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-gray-500">Remaining</span>
              <span className={`text-[10px] font-bold ${isLearnMode ? 'text-emerald-700' : 'text-indigo-700'}`}>{formatTime(Math.max(0, currentTarget - currentElapsed))}</span>
            </div>
            <div className="w-full bg-white h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${isLearnMode ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                style={{ width: `${(currentElapsed / currentTarget) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">
              Overall {isLearnMode ? 'Learning' : 'Focus'} Progress
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-3">
          {!isCompleted ? (
            <>
              <button
                onClick={() => onToggleTimer(task.id)}
                className={`flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95 ${isRunning
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : (isLearnMode ? 'bg-emerald-600' : 'bg-gray-900') + ' text-white hover:opacity-90'
                  }`}
              >
                {isRunning ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> Pause</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> Start {isLearnMode ? 'Learning' : 'Flow'}</>
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
