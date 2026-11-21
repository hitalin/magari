// 利用者が入れたホスト（Misskey のサーバー）への通信は、ここを通す。
// 誰でも偽のサーバーを立てて名乗れるので、素の fetch に任せない:
// - リダイレクトは追わない（別の宛先へ、メソッドと本文ごと運ばれる）
// - 時間を切る（本文を読み切るまでを含む）
// - 本文は MAX_BODY_BYTES までしか読まない（終わらない応答でメモリを埋めさせない）
// 失敗はどれも null。呼ぶ側は「そのサーバーでは入れない」として扱う。
export const MAX_BODY_BYTES = 1024 * 1024;
const TIMEOUT_MS = 5000;

export async function remoteJson(
	url: string,
	init: RequestInit = {},
): Promise<unknown> {
	try {
		const res = await fetch(url, {
			...init,
			redirect: "manual",
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok || !res.body) return null;
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let text = "";
		let size = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > MAX_BODY_BYTES) {
				await reader.cancel();
				return null;
			}
			text += decoder.decode(value, { stream: true });
		}
		return JSON.parse(text + decoder.decode());
	} catch {
		return null;
	}
}
