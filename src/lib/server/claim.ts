// 非公式のページを、店の X アカウントでログインした人がその場で引き取る。
// 照らす相手は、運営が sources.ts に控えた店の X の ID だけ（ページの X の欄は書いた人の自己申告なので使わない）。
import { SOURCES } from "./import/sources";

// handle のページを引き取れる X の ID（@ なし）。取り込み元でなければ null
export function claimX(handle: string): string | null {
	return SOURCES.find((s) => s.actor.handle === handle)?.actor.xHandle ?? null;
}

// username は、引き取りのときに X へ問い合わせて返ってきた ID
export function sameX(xHandle: string, username: unknown): boolean {
	return (
		typeof username === "string" &&
		username.toLowerCase() === xHandle.toLowerCase()
	);
}
