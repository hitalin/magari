// 管理者のいないハコ・団体は、名前・エリア・公式へのリンクだけを出す。
// 画像や紹介文は載せた本人がいないので出さない（権利を持つ人が引き取ってから載せる）
export function nameOnlyIfUnmanaged<
	T extends {
		hasManager: boolean;
		avatarUrl: string | null;
		headerUrl: string | null;
		summary: string | null;
	},
>(actor: T): T {
	if (actor.hasManager) return actor;
	return { ...actor, avatarUrl: null, headerUrl: null, summary: null };
}
