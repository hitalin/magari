import { env } from "cloudflare:workers";
import { redirect } from "@sveltejs/kit";
import { safeNext } from "#lib/next.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
	// ログインのあとに戻る先（/new から来た人は /new へ）
	const next = safeNext(url.searchParams.get("next"));
	if (locals.session) redirect(303, next);
	return {
		xEnabled: !!env.X_CLIENT_ID,
		error: url.searchParams.get("error"),
		next,
	};
};
