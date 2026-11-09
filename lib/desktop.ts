/**
 * Tauri 桌面端原生能力（不经打包器，直接走 __TAURI_INTERNALS__）
 * 动态 import('@tauri-apps/api/window') 在 Next 打包下偶发 chunk 加载问题，
 * invoke 内部协议是 webview 注入的全局能力，100% 可用。
 */

interface TauriInternals {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

function internals(): TauriInternals | null {
  if (typeof window === 'undefined') return null;
  const t = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return t ?? null;
}

/** 当前窗口 label（与 tauri.conf.json 窗口定义一致） */
const LABEL = 'main';

export function isDesktop(): boolean {
  return internals() !== null;
}

export async function winStartDrag(): Promise<void> {
  const t = internals();
  if (!t) return;
  await t.invoke('plugin:window|start_dragging', { label: LABEL });
}

export async function winMinimize(): Promise<void> {
  const t = internals();
  if (!t) return;
  await t.invoke('plugin:window|minimize', { label: LABEL });
}

export async function winToggleMaximize(): Promise<void> {
  const t = internals();
  if (!t) return;
  await t.invoke('plugin:window|toggle_maximize', { label: LABEL });
}

export async function winClose(): Promise<void> {
  const t = internals();
  if (!t) return;
  await t.invoke('plugin:window|close', { label: LABEL });
}
