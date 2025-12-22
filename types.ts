
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  targetDuration: number; // In seconds
  elapsedSeconds: number;
  status: TaskStatus;
  createdAt: number;
}
