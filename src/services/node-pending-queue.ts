/**
 * src/services/node-pending-queue.ts
 * Queue for work destined to dormant (offline) nodes.
 * When a node is offline, jobs are enqueued here and drained when it comes online.
 */

import fs from 'fs-extra';
import path from 'path';
import { getHyperClawDir } from '../infra/paths';

export type NodeWorkType = 'agent:run' | 'command' | 'channel:forward';

export interface NodePendingItem {
  id: string;
  nodeId: string;
  type: NodeWorkType;
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  maxAttempts: number;
}

const QUEUE_FILE = 'node-pending-queue.json';

function getQueuePath(): string {
  return path.join(getHyperClawDir(), QUEUE_FILE);
}

function randomId(): string {
  return `npq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

let cached: NodePendingItem[] | null = null;

function load(): NodePendingItem[] {
  if (cached) return cached;
  try {
    cached = fs.readJsonSync(getQueuePath());
    return Array.isArray(cached) ? cached : [];
  } catch {
    cached = [];
    return [];
  }
}

function save(items: NodePendingItem[]): void {
  fs.ensureDirSync(path.dirname(getQueuePath()));
  fs.writeJsonSync(getQueuePath(), items, { spaces: 2 });
  cached = items;
}

/** Enqueue work for a dormant node. */
export function enqueue(nodeId: string, type: NodeWorkType, payload: Record<string, unknown>, maxAttempts = 5): NodePendingItem {
  const items = load();
  const item: NodePendingItem = {
    id: randomId(),
    nodeId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    maxAttempts
  };
  items.push(item);
  save(items);
  return item;
}

/** List pending items for a node (or all nodes). */
export function listPending(nodeId?: string): NodePendingItem[] {
  const items = load();
  const pending = items.filter(i => i.attemptCount < i.maxAttempts);
  return nodeId ? pending.filter(i => i.nodeId === nodeId) : pending;
}

/** Mark item as attempted (increment attemptCount). Returns false if max attempts reached. */
export function markAttempted(id: string): boolean {
  const items = load();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items[idx].attemptCount++;
  save(items);
  return items[idx].attemptCount < items[idx].maxAttempts;
}

/** Remove item from queue (e.g. after successful delivery). */
export function remove(id: string): boolean {
  const items = load().filter(i => i.id !== id);
  const removed = items.length < load().length;
  save(items);
  return removed;
}

/** Remove all items for a node. */
export function clearForNode(nodeId: string): number {
  const items = load().filter(i => i.nodeId !== nodeId);
  const before = load().length;
  save(items);
  return before - items.length;
}

/** Get items ready to be drained for a node. Caller should process and call remove() on success. */
export function getDrainable(nodeId: string): NodePendingItem[] {
  return listPending(nodeId);
}
