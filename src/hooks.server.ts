import { env } from "cloudflare:workers";
import type { Handle } from "@sveltejs/kit/hooks";
import { createAuth } from "#lib/server/auth.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getActorForUser, syncAvatar } from "#lib/server/me.ts";

// 認証は一貫性が要るので常に primary。モジュールスコープで1回だけ生成する。
const auth = createAuth(getDb(env.DB), env);

// 直前の書き込み位置。これより新しいレプリカからしか読まない（D1 Sessions API）。
// 書き込み（GET 以外）のときだけ更新する。GET で Set-Cookie を付けると CDN がキャッシュしなくなるため。
const BOOKMARK_COOKIE = "d1b";

export const handle: Handle = async ({ event, resolve }) => {
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
