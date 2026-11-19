// 管理者のいないハコ・団体は、名前・エリア・公式へのリンクと、取り込みで写したアイコン・店の写真だけを出す。
// 紹介文は載せた本人がいないので出さない（権利を持つ人が引き取ってから載せる）。
// showSamples は開発環境だけ（取り込んだ見本のハコを、紹介文つきで見た目の確認に使う）
export function nameOnlyIfUnmanaged<
	T extends { hasManager: boolean; summary: string | null },
>(actor: T, showSamples = false): T {
	if (actor.hasManager || showSamples) return actor;
	return { ...actor, summary: null };
}

// ログインでつないだアカウント。hasX はいま X をつないでいるか。x は覚えている X の ID（外したあとも残る。まだ覚えていなければ null）、misskey は "name@host"
export type LinkedSns = { hasX: boolean; x: string | null; misskey: string[] };

// ページに出す X と Misskey。ハコ・団体は編集画面の欄の値。
// 人は、ログインでつないだアカウントをそのまま出す（本人が選んで書く欄は無い）。
// 欄があった頃に手で書いた X だけは、編集画面でリンクへ移すまで出し続ける
export function shownSns(
	actor: {
		kind: "person" | "space" | "group";
		xHandle: string | null;
		misskey: string | null;
	},
	linked: LinkedSns | undefined,
): { xHandle: string | null; misskey: string[] } {
	if (actor.kind !== "person")
		return {
			xHandle: actor.xHandle,
			misskey: actor.misskey ? [actor.misskey] : [],
		};
	return {
		xHandle: linked?.hasX
			? // X の ID を覚える前につないだ人は、ページに写してあった値を使う
				(linked.x ?? actor.xHandle)
			: // つないだときに写した値は、外したら出さない。それと違う値は手で書いたもの
				actor.xHandle !== linked?.x
				? actor.xHandle
				: null,
		misskey: linked?.misskey ?? [],
	};
}
