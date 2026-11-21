import { ANONYMOUS, parseViewer, type Viewer } from "./viewer.ts";

// いま見ている人（表示専用の Cookie から）。サーバーでは読まないので、SSR の HTML はいつもログインしていない形になる
export const viewer = $state<Viewer>({ ...ANONYMOUS });

// ブラウザで、開いた直後とページを移るたびに読み直す（ログイン・ログアウト・ページの追加のあと）
export function refreshViewer() {
	Object.assign(viewer, parseViewer(document.cookie));
}
