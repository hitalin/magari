// 管理者のいないハコ・団体は、名前・エリア・公式へのリンクと、取り込みで写した店の写真だけを出す。
// アイコンや紹介文は載せた本人がいないので出さない（権利を持つ人が引き取ってから載せる）。
// showSamples は開発環境だけ（取り込んだ見本のハコを、アイコンと紹介文つきで見た目の確認に使う）
export function nameOnlyIfUnmanaged<
	T extends {
		hasManager: boolean;
		avatarUrl: string | null;
		summary: string | null;
	},
>(actor: T, showSamples = false): T {
	if (actor.hasManager || showSamples) return actor;
	return { ...actor, avatarUrl: null, summary: null };
}
