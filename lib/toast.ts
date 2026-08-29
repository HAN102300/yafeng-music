'use client';

/**
 * 轻量全局 Toast（基于 zustand）
 * 任意模块直接 import { toast } 调用，无需 Hook 环境。
 */
import { create } from 'zustand';

export type ToastKind = 'info' | 'error' | 'success';

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, kind?: ToastKind) => void;
  remove: (id: number) => void;
}

let nextId = 1;
const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3200;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-(MAX_VISIBLE - 1)), { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 全局入口：toast('已切到下一首', 'error') */
export function toast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().push(message, kind);
}
