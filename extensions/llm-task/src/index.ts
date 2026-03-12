/**
 * @hyperclaw/llm-task
 * LLM task orchestration — decompose, parallelize, retry.
 */

export const LLM_TASK_VERSION = '0.1.0';

export interface Task {
  id: string;
  prompt: string;
  deps?: string[];
}

export interface TaskResult {
  id: string;
  output: string;
  ok: boolean;
}

export async function decomposeTask(prompt: string): Promise<Task[]> {
  // Placeholder: in full impl, LLM splits into subtasks
  return [{ id: '1', prompt }];
}

export async function runTasks(tasks: Task[], runOne: (t: Task) => Promise<TaskResult>): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  for (const t of tasks) {
    results.push(await runOne(t));
  }
  return results;
}
