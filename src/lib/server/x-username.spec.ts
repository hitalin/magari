import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberX, xUserFields } from "./x-username";

const ORIGIN = "https://magari.test";

type Row = Record<string, unknown>;

function setup() {
	const db: Record<string, Row[]> = {
		user: [],
		session: [],
		account: [],
		verification: [],
	};
	const fill = vi.fn(async (_userId: string, _x: string) => {});
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
		user: { additionalFields: xUserFields, validateUserInfo: rememberX(fill) },
		socialProviders: {
			twitter: {
				clientId: "x",
				clientSecret: "x",
				mapProfileToUser: (profile) => ({ xUsername: profile.data.username }),
			},
		},
	});
	// 偽の X。トークンを渡し、/users/me には xId のユーザー（ID は u<xId>）を返す
	let xId = "";
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL | Request) => {
			const url = new URL(input instanceof Request ? input.url : String(input));
			if (url.pathname.endsWith("/token"))
				return Response.json({ access_token: "t", token_type: "bearer" });
			return Response.json({
				data: { id: xId, name: "x", username: `u${xId}` },
			});
		}),
	);
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
	return { db, x, fill };
}

describe("rememberX", () => {
	beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
	afterEach(() => vi.unstubAllGlobals());

	it("X で登録すると、X の ID をユーザーに覚える（ページはまだ無いので写さない）", async () => {
		const { db, x, fill } = setup();
		await x("111");
		expect(db.user[0].xUsername).toBe("u111");
		expect(fill).not.toHaveBeenCalled();
	});

	it("まだ覚えていない人が X で入り直すと、覚えてページへ写す。二度めは写さない", async () => {
		const { db, x, fill } = setup();
		await x("111");
		db.user[0].xUsername = null; // この対応より前に登録した人
		await x("111");
		expect(db.user[0].xUsername).toBe("u111");
		expect(fill).toHaveBeenCalledExactlyOnceWith(db.user[0].id, "u111");
		await x("111");
		expect(fill).toHaveBeenCalledOnce();
	});

	it("別の X をつなぐと、その ID を覚えてページへ写す", async () => {
		const { db, x, fill } = setup();
		const me = await x("111");
		await x("222", me.cookie);
		expect(db.user[0].xUsername).toBe("u222");
		expect(fill).toHaveBeenCalledExactlyOnceWith(db.user[0].id, "u222");
	});

	it("別のユーザーの X はつなげないので、覚えない", async () => {
		const { db, x, fill } = setup();
		const me = await x("111");
		await x("222");
		await x("222", me.cookie);
		expect(db.user[0].xUsername).toBe("u111");
		expect(fill).not.toHaveBeenCalled();
	});
});
