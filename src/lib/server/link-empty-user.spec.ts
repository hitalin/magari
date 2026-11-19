import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adoptOnLink } from "./link-empty-user";

const ORIGIN = "https://magari.test";

type Row = Record<string, unknown>;

function setup(emptyUsers: boolean) {
	const db: Record<string, Row[]> = {
		user: [],
		session: [],
		account: [],
		verification: [],
	};
	const auth = betterAuth({
		baseURL: ORIGIN,
		secret: "test-secret-test-secret-test-secret",
		database: memoryAdapter(db),
		account: {
			accountLinking: {
				enabled: true,
				allowDifferentEmails: true,
				trustedProviders: ["twitter"],
			},
		},
		user: { validateUserInfo: adoptOnLink(async () => emptyUsers) },
		socialProviders: { twitter: { clientId: "x", clientSecret: "x" } },
	});
	// 偽の X。トークンを渡し、/users/me には xId のユーザーを返す
	let xId = "";
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL | Request) => {
			const url = new URL(input instanceof Request ? input.url : String(input));
			if (url.pathname.endsWith("/token"))
				return Response.json({ access_token: "t", token_type: "bearer" });
			return Response.json({ data: { id: xId, name: "x", username: "x" } });
		}),
	);
	// 消された cookie（値が空）は持ち越さない
	const cookies = (res: Response) =>
		res.headers
			.getSetCookie()
			.map((c) => c.split(";")[0])
			.filter((c) => !c.endsWith("="));

	// X で id として許可して戻ってくる。cookie を渡すと「つなぐ」動きになる
	async function x(id: string, cookie?: string) {
		xId = id;
		const start = await auth.handler(
			new Request(
				`${ORIGIN}/api/auth/${cookie ? "link-social" : "sign-in/social"}`,
				{
					method: "POST",
					headers: {
						"content-type": "application/json",
						origin: ORIGIN,
						...(cookie ? { cookie } : {}),
					},
					body: JSON.stringify({
						provider: "twitter",
						callbackURL: "/me",
						errorCallbackURL: "/me",
					}),
				},
			),
		);
		const { url } = (await start.json()) as { url: string };
		const state = new URL(url).searchParams.get("state");
		const back = await auth.handler(
			new Request(`${ORIGIN}/api/auth/callback/twitter?code=c&state=${state}`, {
				headers: { cookie: [cookie, ...cookies(start)].join("; ") },
			}),
		);
		return {
			location: back.headers.get("location"),
			cookie: cookies(back).join("; "),
		};
	}
	return { db, x };
}

describe("adoptOnLink", () => {
	beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
	afterEach(() => vi.unstubAllGlobals());

	it("間違えて出来た空のユーザーの X は、つなぐときに今のユーザーへ寄せる", async () => {
		const { db, x } = setup(true);
		const me = await x("111");
		await x("222"); // 別のユーザーが出来てしまった
		expect(db.user).toHaveLength(2);
		const res = await x("222", me.cookie);
		expect(res.location).toBe("/me");
		expect(db.user).toHaveLength(1);
		expect(db.account.map((a) => [a.accountId, a.userId])).toEqual([
			["111", db.user[0].id],
			["222", db.user[0].id],
		]);
	});

	it("中身のある別のユーザーの X は寄せない", async () => {
		const { db, x } = setup(false);
		const me = await x("111");
		await x("222");
		const res = await x("222", me.cookie);
		expect(res.location).toContain(
			"/me?error=account_already_linked_to_different_user",
		);
		expect(db.user).toHaveLength(2);
	});
});
