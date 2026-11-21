import { env } from "cloudflare:workers";
import type { Handle } from "@sveltejs/kit/hooks";
import { createAuth } from "#lib/server/auth.ts";
import { isCrossSite } from "#lib/server/cross-site.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getActorForUser, syncAvatar } from "#lib/server/me.ts";

// 認証は一貫性が要るので常に primary。モジュールスコープで1回だけ生成する。
const auth = createAuth(getDb(env.DB), env);

// 直前の書き込み位置。これより新しいレプリカからしか読まない（D1 Sessions API）。
// 書き込み（GET 以外）のときだけ更新する。GET で Set-Cookie を付けると CDN がキャッシュしなくなるため。
const BOOKMARK_COOKIE = "d1b";

// どの応答にも付ける。中身を縛る CSP は vite.config.ts（スクリプトのハッシュを SvelteKit が足す）
const SECURITY_HEADERS = {
	"x-content-type-options": "nosniff",
	"referrer-policy": "strict-origin-when-cross-origin",
	// CSP の frame-ancestors を読まない古いブラウザ向け
	"x-frame-options": "DENY",
	"strict-transport-security": "max-age=31536000",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export const handle: Handle = async ({ event, resolve }) => {
	if (isCrossSite(event.request, event.url.origin))
		return new Response("別のサイトからの書き込みは受け付けません", {
			status: 403,
		});

	const session = env.DB.withSession(
		event.cookies.get(BOOKMARK_COOKIE) ?? "first-unconstrained",
	);
	event.locals.db = getDb(session);
	event.locals.auth = auth;
	event.locals.session = await auth.api.getSession({
		headers: event.request.headers,
	});
	const actor = event.locals.session
		? await getActorForUser(event.locals.db, event.locals.session.user.id)
		: null;
	event.locals.actor =
		actor && event.locals.session
			? await syncAvatar(
					event.locals.db,
					actor,
					event.locals.session.user.image,
				)
			: actor;

	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS))
		response.headers.set(name, value);

	const bookmark = session.getBookmark();
	if (event.request.method !== "GET" && bookmark) {
		const res = new Response(response.body, response);
		res.headers.append(
			"set-cookie",
			`${BOOKMARK_COOKIE}=${bookmark}; Path=/; HttpOnly; SameSite=Lax; Max-Age=60`,
		);
		return res;
	}
	return response;
};
