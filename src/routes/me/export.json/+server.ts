import { env } from "cloudflare:workers";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { toExport } from "#lib/export.ts";
import {
	actors,
	eventHosts,
	eventSeries,
	events,
} from "#lib/server/db/schema.ts";
import { listManagedActorIds, requireLogin } from "#lib/server/me.ts";
import type { RequestHandler } from "./$types";

// 自分のデータを 1 つの JSON で持ち出す: 自分のページと管理しているページ、自分が開いた間（主催の間を含む）、ログイン方法。
// 取り込んだ会と落書きは本人のものではないので含めない
export const GET: RequestHandler = async ({ locals, request }) => {
	const session = requireLogin(locals);
	const db = locals.db;
	const actorIds = await listManagedActorIds(db, session.user.id, locals.actor);
	const hosted = db
		.select({ id: eventHosts.eventId })
		.from(eventHosts)
		.where(inArray(eventHosts.actorId, actorIds));
	const mine = and(
		isNull(events.source),
		actorIds.length
			? or(
					eq(events.createdByUserId, session.user.id),
					inArray(events.id, hosted),
				)
			: eq(events.createdByUserId, session.user.id),
	);
	const space = alias(actors, "space");
	const [logins, pages, rows, hosts] = await Promise.all([
		locals.auth.api.listUserAccounts({ headers: request.headers }),
		actorIds.length
			? db.select().from(actors).where(inArray(actors.id, actorIds))
			: [],
		db
			.select({
				event: events,
				spaceHandle: space.handle,
				repeat: eventSeries.rrule,
				repeatUntil: eventSeries.until,
			})
			.from(events)
			.leftJoin(space, eq(events.spaceActorId, space.id))
			.leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
			.where(mine)
			.orderBy(asc(events.startsAt)),
		db
			.select({ eventId: eventHosts.eventId, handle: actors.handle })
			.from(eventHosts)
			.innerJoin(actors, eq(eventHosts.actorId, actors.id))
			.where(
				inArray(
					eventHosts.eventId,
					db.select({ id: events.id }).from(events).where(mine),
				),
			),
	]);
	const doc = toExport({
		origin: env.PUBLIC_ORIGIN,
		exportedAt: new Date(),
		logins,
		pages,
		events: rows.map((r) => ({
			...r.event,
			spaceHandle: r.spaceHandle,
			repeat: r.repeat,
			repeatUntil: r.repeatUntil,
			hosts: hosts.filter((h) => h.eventId === r.event.id).map((h) => h.handle),
		})),
	});
	return new Response(JSON.stringify(doc, null, 2), {
		headers: {
			"content-type": "application/json; charset=utf-8",
			"content-disposition": 'attachment; filename="magari-export.json"',
			"cache-control": "private, no-store",
		},
	});
};
