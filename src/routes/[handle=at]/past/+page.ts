import { error } from "@sveltejs/kit";
import { cacheLike } from "#lib/cache.ts";
import type { ActorPast } from "#lib/types.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, url, setHeaders }) => {
	const before = url.searchParams.get("before");
	const res = await fetch(
		`/api/actors/${params.handle}/past${before ? `?before=${encodeURIComponent(before)}` : ""}`,
	);
	if (!res.ok) error(res.status, "見つかりません");
	cacheLike(res, setHeaders);
	return { ...((await res.json()) as ActorPast), first: !before };
};
