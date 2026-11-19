import type { BetterAuthOptions } from "better-auth";

// X でログイン・連携したときに X の ID（@ なし）をユーザーに覚え、その人のページの X の欄へ写す。
// 写すのは ID が変わったときだけ（本人が欄を空にしたあと、入り直すたびに戻さないため）。

// input: false にすると mapProfileToUser の値まで捨てられる。本人が書き換えられても、ページの X の欄と同じ自己申告なので困らない
export const xUserFields = {
	xUsername: { type: "string", required: false },
} as const;

// userId の人のページの X の欄が空なら x を入れる
export type FillXHandle = (userId: string, x: string) => Promise<void>;

// 登録のときはまだページが無いので、mapProfileToUser で xUsername に入れておき、ページを作るときに写す
export const rememberX =
	(
		fillXHandle: FillXHandle,
	): NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]> =>
	async ({ user, source }, ctx) => {
		if (source.action === "create-user" || source.method !== "oauth") return;
		if (source.oauth?.providerId !== "twitter" || !user.id) return;
		const data = (
			source.oauth.profile as
				| { data?: { id?: unknown; username?: unknown } }
				| undefined
		)?.data;
		if (!data?.id || typeof data.username !== "string") return;
		const adapter = ctx.context.internalAdapter;
		// 別のユーザーにつながっている X は、このあと better-auth が断る
		const existing = await adapter.findAccountByKey({
			providerId: "twitter",
			accountId: String(data.id),
		});
		if (existing && existing.userId !== user.id) return;
		const me = (await adapter.findUserById(user.id)) as {
			xUsername?: string | null;
		} | null;
		if (!me || me.xUsername === data.username) return;
		await adapter.updateUser(user.id, { xUsername: data.username });
		await fillXHandle(user.id, data.username);
	};
