import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { miauth } from "./miauth";

const ORIGIN = "https://magari.test";

type Row = Record<string, unknown>;

// 偽の Misskey。/api/meta には応答し、/api/miauth/{session}/check には who が返したユーザーを返す
function stubMisskey(who: () => string | null) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: string | URL) => {
			const url = new URL(String(input));
			if (url.pathname === "/api/meta")
				return Response.json({ version: "2025.1.0" });
			const username = who();
			return Response.json(
				username
					? {
							ok: true,
							token: "t",
							user: { username, name: null, avatarUrl: null },
						}
					: { ok: false },
			);
		}),
	);
}

function setup(emptyUsers = true) {
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
		plugins: [
			miauth({ appName: "まがり", isEmptyUser: async () => emptyUsers }),
		],
	});
	let username: string | null = null;
	stubMisskey(() => username);

	// Misskey で user として許可して戻ってくる。cookie を渡すと「つなぐ」動きになる
	async function login(user: string | null, host: string, cookie?: string) {
		username = user;
		const start = await auth.handler(
			new Request(`${ORIGIN}/api/auth/sign-in/miauth`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: ORIGIN,
					...(cookie ? { cookie } : {}),
				},
				body: JSON.stringify({ host, callbackURL: "/new" }),
			}),
		);
		if (!start.ok) return { status: start.status, location: null, cookie: "" };
		const { url } = (await start.json()) as { url: string };
		const session = new URL(url).pathname.split("/").pop();
		const back = await auth.handler(
			new Request(`${ORIGIN}/api/auth/miauth/callback?session=${session}`),
		);
		return {
			status: back.status,
			location: back.headers.get("location"),
			cookie: back.headers
				.getSetCookie()
				.map((c) => c.split(";")[0])
				.join("; "),
		};
	}
	return { db, login };
}

describe("miauth", () => {
	beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
	afterEach(() => vi.unstubAllGlobals());

	it("はじめての人はユーザーができ、2 回目は同じユーザーで入る", async () => {
		const { db, login } = setup();
		const first = await login("Taka", "yami.ski");
		expect(first.location).toBe(`${ORIGIN}/new`);
		expect(first.cookie).toContain("session_token");
		expect(db.account).toMatchObject([
			{ providerId: "miauth", accountId: "taka@yami.ski" },
		]);
		// Misskey のトークンは持たない
		expect(db.account[0].accessToken ?? null).toBeNull();
		await login("Taka", "yami.ski");
		expect(db.user).toHaveLength(1);
		expect(db.session).toHaveLength(2);
	});

	it("Misskey のサーバーでなければ始めない", async () => {
		const { login } = setup();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("not found", { status: 404 })),
		);
		expect((await login("taka", "example.com")).status).toBe(400);
	});

	it("許可されなければログイン画面に戻す（戻る先は保つ）", async () => {
		const { db, login } = setup();
		const res = await login(null, "yami.ski");
		expect(res.location).toBe(
			`${ORIGIN}/login?next=%2Fnew&error=miauth_denied`,
		);
		expect(db.user).toHaveLength(0);
	});

	it("ログイン中は、別の Misskey アカウントを同じユーザーにいくつでもつなぐ", async () => {
		const { db, login } = setup();
		const me = await login("taka", "yami.ski");
		await login("taka", "misskey.io", me.cookie);
		await login("sub", "misskey.io", me.cookie);
		expect(db.user).toHaveLength(1);
		expect(db.account.map((a) => a.accountId)).toEqual([
			"taka@yami.ski",
			"taka@misskey.io",
			"sub@misskey.io",
		]);
		// つないだアカウントで入っても同じユーザー
		await login("sub", "misskey.io");
		expect(db.user).toHaveLength(1);
		expect(db.session.every((s) => s.userId === db.user[0].id)).toBe(true);
	});

	it("間違えて出来た空のユーザーのアカウントは、つなぐときに今のユーザーへ寄せる", async () => {
		const { db, login } = setup(true);
		const me = await login("taka", "yami.ski");
		await login("sub", "misskey.io"); // 別のユーザーが出来てしまった
		expect(db.user).toHaveLength(2);
		const res = await login("sub", "misskey.io", me.cookie);
		expect(res.location).toBe(`${ORIGIN}/new`);
		expect(db.user).toHaveLength(1);
		expect(db.account.every((a) => a.userId === db.user[0].id)).toBe(true);
		expect(db.account).toHaveLength(2);
	});

	it("中身のある別のユーザーのアカウントは寄せない", async () => {
		const { db, login } = setup(false);
		const me = await login("taka", "yami.ski");
		await login("sub", "misskey.io");
		const res = await login("sub", "misskey.io", me.cookie);
		expect(res.location).toBe(`${ORIGIN}/me?error=miauth_linked_elsewhere`);
		expect(db.user).toHaveLength(2);
	});

	it("ログイン方法が 1 つも残っていない前のユーザーには、同じ Misskey で戻れる", async () => {
		const { db, login } = setup();
		await login("taka", "yami.ski");
		db.account.length = 0; // 0013 の migration で消えた状態
		db.session.length = 0;
		const res = await login("taka", "yami.ski");
		expect(res.location).toBe(`${ORIGIN}/new`);
		expect(db.user).toHaveLength(1);
		expect(db.account).toMatchObject([
			{ accountId: "taka@yami.ski", userId: db.user[0].id },
		]);
	});

	it("本人が外した Misskey では入れない", async () => {
		const { db, login } = setup();
		const me = await login("taka", "yami.ski");
		await login("sub", "misskey.io", me.cookie);
		db.account.splice(0, 1); // taka@yami.ski を外した
		const res = await login("taka", "yami.ski");
		expect(res.location).toBe(
			`${ORIGIN}/login?next=%2Fnew&error=miauth_unlinked`,
		);
		expect(db.user).toHaveLength(1);
		expect(db.account).toHaveLength(1);
	});
});
