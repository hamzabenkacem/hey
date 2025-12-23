export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum TaskMode {
  FOCUS = 'FOCUS',
  LEARN = 'LEARN'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  targetDuration: number; // Focus target in seconds
  focusElapsed: number;
  learnTargetDuration: number; // Learn target in seconds
  learnElapsed: number;
  activeMode: TaskMode;
  status: TaskStatus;
  createdAt: number;
  lastProceededAt?: number;
}
