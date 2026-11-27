import { CACHE_PUBLIC } from "#lib/server/cache.ts";
import { listIndexable } from "#lib/server/events.ts";
import { sitemapXml } from "#lib/sitemap.ts";
import type { RequestHandler } from "./$types";

const PAGES = [
	"/",
	"/events",
	"/calendar",
	"/wall",
	"/spaces",
	"/eventers",
	"/owners",
];

export const GET: RequestHandler = async ({ locals, url }) => {
	const { events, actors } = await listIndexable(locals.db);
	const xml = sitemapXml(url.origin, [
		...PAGES.map((path) => ({ path })),
		...actors.map((a) => ({ path: `/@${a.handle}`, lastmod: a.updatedAt })),
		...events.map((e) => ({ path: `/e/${e.id}`, lastmod: e.updatedAt })),
	]);
	return new Response(xml, {
		headers: {
			"content-type": "application/xml; charset=utf-8",
			"cache-control": CACHE_PUBLIC,
		},
	});
};
