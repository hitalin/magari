import type {
	Account,
	BetterAuthOptions,
	GenericEndpointContext,
} from "better-auth";

// 間違えて別のアカウントで入ると、空のユーザー（ページも会も無い）が出来る。
// 入り直してそのアカウントをつなぐときは、「別のユーザーのもの」と断らずに今のユーザーへ寄せ、空のユーザーは消す。

type Adapter = GenericEndpointContext["context"]["internalAdapter"];
export type IsEmptyUser = (userId: string) => Promise<boolean>;

// account を userId のユーザーへ移す。持ち主に中身があれば移さず false
export async function adoptAccount(
	adapter: Adapter,
	account: Account,
	userId: string,
	isEmptyUser: IsEmptyUser,
): Promise<boolean> {
	const owner = account.userId;
	if (!(await isEmptyUser(owner))) return false;
	await adapter.updateAccount(account.id, { userId });
	if ((await adapter.findAccounts(owner)).length === 0)
		await adapter.deleteUser(owner);
	return true;
}

// X をつなぐとき用。better-auth が「別のユーザーにつながっている」と断る手前で呼ばれる
// user.validateUserInfo に置く（つなぐ相手の X の ID が分かり、断られる前に動けるのはここだけ）。
// 寄せられなければ何もしないので、そのあと better-auth が今までどおり断る
export const adoptOnLink =
	(
		isEmptyUser: IsEmptyUser,
	): NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]> =>
	async ({ user, source }, ctx) => {
		if (source.action !== "link-account" || source.method !== "oauth") return;
		if (source.oauth?.providerId !== "twitter" || !user.id) return;
		const id = (source.oauth.profile as { data?: { id?: unknown } } | undefined)
			?.data?.id;
		if (!id) return;
		const adapter = ctx.context.internalAdapter;
		const existing = await adapter.findAccountByKey({
			providerId: "twitter",
			accountId: String(id),
		});
		if (existing && existing.userId !== user.id)
			await adoptAccount(adapter, existing, user.id, isEmptyUser);
	};
