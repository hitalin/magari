// 組み上げた Worker を手元で立てて、ひと通り叩く（pnpm smoke。CI でも走る）。
// 型・lint・単体テストでは見えない決め事を見張る: 公開と本人だけの応答の分け方、ログイン、間の作成と繰り返し。
// D1 は専用の置き場（.wrangler/smoke）に作り直すので、開発用のデータには触らない。先に pnpm build が要る。
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { DatabaseSync } from "node:sqlite";

const PORT = 8798;
const BASE = `http://localhost:${PORT}`;
const STATE = ".wrangler/smoke";
const TOKEN = "smoke-session-token";
const GUEST_TOKEN = "smoke-guest-token";

if (!existsSync(".svelte-kit/cloudflare"))
	throw new Error("先に pnpm build を走らせてください");

const wrangler = (...args) =>
	execFileSync("pnpm", ["exec", "wrangler", ...args], {
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, CI: "1" },
	}).toString();

// --- 用意: 空の D1 にマイグレーションを当て、ログイン済みの人を 1 人入れる
rmSync(STATE, { recursive: true, force: true });
wrangler(
	"d1",
	"migrations",
	"apply",
	"magari",
	"--local",
	"--persist-to",
	STATE,
);
const now = Math.floor(Date.now() / 1000);
writeFileSync(
	`${STATE}/seed.sql`,
	`INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES ('u1','煙','smoke@example.invalid',0,${now}000,${now}000);
INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('s1','${TOKEN}','u1',${now + 3600}000,${now}000,${now}000);
INSERT INTO actors (id,handle,kind,user_id,name,facilities,links,created_at,updated_at) VALUES ('a1','smoke_test','person','u1','煙','[]','[]',${now},${now});
INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES ('u2','客','guest@example.invalid',0,${now}000,${now}000);
INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES ('s2','${GUEST_TOKEN}','u2',${now + 3600}000,${now}000,${now}000);
INSERT INTO actors (id,handle,kind,user_id,name,facilities,links,created_at,updated_at) VALUES ('a2','smoke_guest','person','u2','客','[]','[]',${now},${now});`,
);
wrangler(
	"d1",
	"execute",
	"magari",
	"--local",
	"--persist-to",
	STATE,
	"--file",
	`${STATE}/seed.sql`,
);

// better-auth のセッション Cookie（値に署名を付けたもの）
const secret = /^BETTER_AUTH_SECRET="?([^"\n]+)/m.exec(
	readFileSync(".dev.vars", "utf8"),
)?.[1];
assert(secret, ".dev.vars に BETTER_AUTH_SECRET が要ります");
const sessionCookie = (token) =>
	`better-auth.session_token=${encodeURIComponent(
		`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`,
	)}`;
const SESSION = sessionCookie(TOKEN);
// 会を主催したことのない、ログインしただけの人
const GUEST = sessionCookie(GUEST_TOKEN);

const server = spawn(
	"pnpm",
	["exec", "wrangler", "dev", "--port", String(PORT), "--persist-to", STATE],
	{ stdio: ["ignore", "pipe", "pipe"], detached: true },
);
let log = "";
server.stdout.on("data", (d) => {
	log += d;
});
server.stderr.on("data", (d) => {
	log += d;
});
const stop = () => {
	try {
		process.kill(-server.pid);
	} catch {}
};

const get = (path, { cookie, ...init } = {}) =>
	fetch(BASE + path, {
		redirect: "manual",
		...init,
		headers: {
			accept: "text/html",
			...(cookie ? { cookie } : {}),
			...init.headers,
		},
	});
const post = (path, fields, { cookie = SESSION, origin = BASE } = {}) =>
	get(path, {
		method: "POST",
		cookie,
		headers: { origin, "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(fields),
	});
const json = async (path, opts) => (await get(path, opts)).json();
const cacheControl = (res) => res.headers.get("cache-control") ?? "";
// 作った間は「あした」から。日付は JST
const day = (offset) =>
	new Date(Date.now() + (offset * 24 + 9) * 3_600_000)
		.toISOString()
		.slice(0, 10);

const checks = [];
const check = (name, fn) => checks.push([name, fn]);

check("公開ページは公開の応答で、書き込みで消せる札が付く", async () => {
	for (const path of ["/", "/home", "/calendar", "/wall", "/spaces"]) {
		const res = await get(path);
		assert.equal(res.status, 200, path);
		assert.match(cacheControl(res), /public/, path);
		assert.equal(res.headers.get("cache-tag"), "data", path);
		assert.equal(res.headers.get("set-cookie"), null, path);
		assert.equal(res.headers.get("x-content-type-options"), "nosniff", path);
	}
});

check("公開と書いていない応答は、キャッシュに載せない", async () => {
	for (const path of ["/terms", "/login", "/contact", "/e/zzzzzzzzzz"])
		assert.equal(cacheControl(await get(path)), "private, no-store", path);
});

check("ログインの要るページは、未ログインなら /login へ送る", async () => {
	for (const path of ["/me", "/new", "/spaces/new", "/me/export.json"]) {
		const res = await get(path);
		assert.equal(res.status, 303, path);
		assert.match(res.headers.get("location"), /^\/login/, path);
		assert.equal(cacheControl(res), "private, no-store", path);
	}
});

check("別のサイトからの書き込みは断る", async () => {
	const res = await post("/logout", {}, { origin: "https://evil.example" });
	assert.equal(res.status, 403);
});

check("ログイン中は、表示専用の Cookie が置かれる", async () => {
	const res = await get("/me", { cookie: SESSION });
	assert.equal(res.status, 200);
	assert.equal(cacheControl(res), "private, no-store");
	assert.match(res.headers.get("set-cookie") ?? "", /^me=%7B.*smoke_test/);
});

let first;
let occurrences;
check("毎週の間を、終わりの日つきで開ける", async () => {
	const res = await post("/new?/save", {
		title: "煙の会",
		date: day(1),
		startTime: "19:00",
		status: "published",
		repeat: "weekly",
		repeatUntil: day(15),
	});
	assert.equal(res.status, 303);
	first = /^\/e\/([a-z0-9]+)\?opened$/.exec(res.headers.get("location"))?.[1];
	assert(first, `転送先: ${res.headers.get("location")}`);
	const all = await json("/api/events");
	occurrences = all.filter((e) => e.title === "煙の会");
	// あした・1 週間後・2 週間後
	assert.equal(occurrences.length, 3);
});

check("間のページは公開で、繰り返しの決まりと先の回が付く", async () => {
	const res = await get(`/api/events/${first}`);
	assert.match(cacheControl(res), /public/);
	const event = await res.json();
	assert.match(event.series.label, /^毎週.曜$/);
	assert.equal(event.series.prev, null);
	assert.equal(event.series.next.length, 2);
	assert(event.series.until);
});

check("公開ページの HTML は、だれが見ても同じ", async () => {
	for (const path of ["/home", `/e/${first}`, "/@smoke_test"]) {
		const anonymous = await get(path);
		const loggedIn = await get(path, { cookie: SESSION });
		assert.match(cacheControl(loggedIn), /public/, path);
		assert.equal(loggedIn.headers.get("set-cookie"), null, path);
		assert.equal(await loggedIn.text(), await anonymous.text(), path);
	}
});

check("下書きは本人にだけ見え、キャッシュに載らない", async () => {
	const res = await post("/new?/save", {
		id: "smk2345678",
		title: "下書きの会",
		date: day(2),
		startTime: "19:00",
		status: "draft",
	});
	assert.equal(res.status, 303);
	assert.equal((await get("/api/events/smk2345678")).status, 404);
	const mine = await get("/api/events/smk2345678", { cookie: SESSION });
	assert.equal(mine.status, 200);
	assert.equal(cacheControl(mine), "private, no-store");
	const page = await get("/e/smk2345678", { cookie: SESSION });
	assert.equal(page.status, 200);
	assert.equal(cacheControl(page), "private, no-store");
});

check("「この先の回もまとめて直す」は、先の回すべてに効く", async () => {
	const res = await post(`/e/${first}/edit?/save`, {
		title: "煙の会 改",
		date: day(1),
		startTime: "20:00",
		status: "published",
		following: "on",
	});
	assert.equal(res.status, 303);
	const all = await json("/api/events");
	assert.equal(all.filter((e) => e.title === "煙の会 改").length, 3);
	assert.equal(all.filter((e) => e.title === "煙の会").length, 0);
});

check("この回だけ直すと、繰り返しから外れる", async () => {
	const second = occurrences[1].id;
	const res = await post(`/e/${second}/edit?/save`, {
		title: "煙の会 特別回",
		date: occurrences[1].startsAt.slice(0, 10),
		startTime: "20:00",
		status: "published",
	});
	assert.equal(res.status, 303);
	assert.equal((await json(`/api/events/${second}`)).series, null);
	assert.equal((await json(`/api/events/${first}`)).series.next.length, 1);
});

check("ハコは見取り図（間取り）を持てる", async () => {
	assert.equal(
		(
			await post("/spaces/new", {
				handle: "smoke_house",
				name: "煙の家",
				kind: "space",
			})
		).status,
		303,
	);
	const saved = await post("/@smoke_house/edit?/profile", {
		name: "煙の家",
		floorPlan: "リビング リビング 屋上\nリビング リビング 屋上",
		region: "東京都",
	});
	assert.equal(saved.status, 303);
	const { actor } = await json("/api/actors/smoke_house");
	assert.deepEqual(actor.rooms, [
		{ name: "リビング", x: 0, y: 0, w: 2, h: 2 },
		{ name: "屋上", x: 2, y: 0, w: 1, h: 2 },
	]);
	// 四角になっていない見取り図は断る
	const bad = await post("/@smoke_house/edit?/profile", {
		name: "煙の家",
		floorPlan: "リビング リビング\nリビング 屋上",
	});
	assert.equal(bad.status, 400);
});

check("間取りは、人のページには付かない", async () => {
	const res = await post("/@smoke_test/edit?/profile", {
		name: "煙",
		floorPlan: "A B",
	});
	assert.equal(res.status, 303);
	const { actor } = await json("/api/actors/smoke_test");
	assert.deepEqual(actor.rooms, []);
});

const roof = {
	title: "屋上の会",
	date: day(2),
	startTime: "19:00",
	status: "published",
	space: "smoke_house",
};
let roofId;
check("間は、ハコの間取りにある区画でだけ開けられる", async () => {
	const wrong = await post("/new?/save", { ...roof, room: "地下" });
	assert.equal(wrong.status, 400);
	assert.match(await wrong.text(), /リビング/);
	const res = await post("/new?/save", { ...roof, room: "屋上" });
	assert.equal(res.status, 303);
	roofId = /^\/e\/([a-z0-9]+)/.exec(res.headers.get("location"))?.[1];
	const event = await json(`/api/events/${roofId}`);
	assert.equal(event.room, "屋上");
	// 会のページは、ハコの見取り図の上でその区画を塗る
	assert.deepEqual(
		event.plan.map((r) => r.name),
		["リビング", "屋上"],
	);
});

check(
	"ハコが間取りを直しても、開けてある間は前の区画のまま直せる",
	async () => {
		const saved = await post("/@smoke_house/edit?/profile", {
			name: "煙の家",
			floorPlan: "リビング",
		});
		assert.equal(saved.status, 303);
		const kept = await post(`/e/${roofId}/edit?/save`, {
			...roof,
			title: "屋上の会（改）",
			room: "屋上",
		});
		assert.equal(kept.status, 303);
		assert.equal((await json(`/api/events/${roofId}`)).room, "屋上");
		// 別の区画に書き換えるなら、いまの間取りと照らす
		const moved = await post(`/e/${roofId}/edit?/save`, {
			...roof,
			room: "地下",
		});
		assert.equal(moved.status, 400);
	},
);

const ng = { kind: "ng", a: "@smoke_house", b: "@smoke_test" };
check("主催どうしの関係のメモは、ページの管理者にだけ見える", async () => {
	const added = await post("/@smoke_house/moderation?/add", ng);
	assert.equal(added.status, 200);
	const page = await get("/@smoke_house/moderation", { cookie: SESSION });
	assert.equal(page.status, 200);
	assert.equal(cacheControl(page), "private, no-store");
	assert.match(await page.text(), /@smoke_test/);
	// 管理者でない人には、無いページ。未ログインは /login へ
	assert.equal(
		(await get("/@smoke_house/moderation", { cookie: GUEST })).status,
		404,
	);
	assert.equal((await get("/@smoke_house/moderation")).status, 303);
	assert.equal(
		(await post("/@smoke_house/moderation?/add", ng, { cookie: GUEST })).status,
		404,
	);
	// 公開の出口と書き出しには出ない
	for (const path of ["/@smoke_house", "/api/actors/smoke_house"])
		assert.doesNotMatch(await (await get(path)).text(), /共演|sealed/, path);
	const exported = await get("/me/export.json", { cookie: SESSION });
	assert.doesNotMatch(await exported.text(), /共演|sealed/);
});

check("メモに書けるのは、主催として載っているページだけ", async () => {
	// ログインしただけの人（客かもしれない）は書けない
	const guest = await post("/@smoke_house/moderation?/add", {
		kind: "authority",
		a: "@smoke_guest",
	});
	assert.equal(guest.status, 400);
	// @ID でない名前の自由記述も書けない
	const free = await post("/@smoke_house/moderation?/add", {
		kind: "authority",
		a: "山田さん",
	});
	assert.equal(free.status, 400);
});

check("メモは D1 に封じて置かれ、消せる", async () => {
	const dir = `${STATE}/v3/d1/miniflare-D1DatabaseObject`;
	const rows = readdirSync(dir)
		.filter((f) => f.endsWith(".sqlite"))
		.flatMap((f) => {
			const db = new DatabaseSync(`${dir}/${f}`, { readOnly: true });
			try {
				return db.prepare("SELECT id, sealed FROM host_moderations").all();
			} catch {
				return [];
			} finally {
				db.close();
			}
		});
	assert.equal(rows.length, 1);
	assert.doesNotMatch(rows[0].sealed, /ng|a1|smoke/);
	const removed = await post("/@smoke_house/moderation?/remove", {
		id: rows[0].id,
	});
	assert.equal(removed.status, 200);
	const page = await get("/@smoke_house/moderation", { cookie: SESSION });
	assert.doesNotMatch(await page.text(), /@smoke_test/);
});

check("自分のデータを JSON で書き出せる", async () => {
	const res = await get("/me/export.json", { cookie: SESSION });
	assert.equal(res.status, 200);
	assert.equal(cacheControl(res), "private, no-store");
	const doc = await res.json();
	assert.equal(doc.pages[0].handle, "smoke_test");
	// 煙の会の 4 回と、屋上の会
	assert.equal(doc.events.length, 5);
	assert(doc.events.some((e) => e.room === "屋上"));
	assert.equal(doc.events.filter((e) => e.repeat === "FREQ=WEEKLY").length, 2);
});

check(
	"ログインしていない人の POST は、書き込みと数えず /login へ送る",
	async () => {
		const res = await post("/new?/save", { title: "x" }, { cookie: "" });
		assert.equal(res.status, 303);
		assert.match(res.headers.get("location"), /^\/login/);
	},
);

check("Service Worker とオフラインのページを配る", async () => {
	assert.equal((await get("/service-worker.js")).status, 200);
	assert.equal((await get("/offline")).status, 200);
});

check("無い画像は 404", async () => {
	assert.equal((await get("/i/nope/x.jpg?w=480")).status, 404);
});

check("ログアウトで、表示専用の Cookie が消える", async () => {
	const res = await post("/logout", {}, { cookie: `${SESSION}; me=x` });
	assert.equal(res.status, 303);
	assert.match(res.headers.get("set-cookie") ?? "", /me=; .*Max-Age=0/);
});

let failed = 0;
try {
	for (let i = 0; ; i++) {
		try {
			if ((await fetch(`${BASE}/terms`)).ok) break;
		} catch {}
		if (i > 120) throw new Error(`サーバーが立ち上がりません\n${log}`);
		await new Promise((r) => setTimeout(r, 500));
	}
	for (const [name, fn] of checks) {
		try {
			await fn();
			console.log(`✓ ${name}`);
		} catch (e) {
			failed++;
			console.error(
				`✗ ${name}\n  ${String(e.message).replaceAll("\n", "\n  ")}`,
			);
		}
	}
} finally {
	stop();
}
if (failed) {
	console.error(`\n${failed} 件が通りませんでした`);
	process.exit(1);
}
console.log(`\n${checks.length} 件すべて通りました`);
process.exit(0);
