import { and, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import {
	OVERPAINT,
	parseWallKey,
	type Scribble,
	VISIBLE,
	WALL_DAYS,
	type WallOwner,
	wallKey,
} from "#lib/graffiti.ts";
import type { ModerationTarget } from "#lib/report-form.ts";
import type { Db } from "./db/index.ts";
import { actors, events, graffiti } from "./db/schema.ts";

// 壁（空なら共有の地面）の落書き。最後の上塗りから後のぶんを、古い順（新しいものが上に描かれる）に。
// 上塗りの印の行も返す（塗った跡を描くため）
export async function listScribbles(db: Db, wall: string): Promise<Scribble[]> {
	const rows = await db
		.select({ id: graffiti.id, d: graffiti.d })
		.from(graffiti)
		.where(
			and(
				eq(graffiti.wall, wall),
				// 印の 'x'（OVERPAINT）は、索引（graffiti_paint_idx）の条件と同じ字面で書く。
				// 同じ秒に描かれた線と前後を取り違えないよう、時刻でなく行の並び（rowid）で比べる
				sql`"graffiti".rowid >= coalesce((select max(g.rowid) from graffiti g where g.wall = ${wall} and g.d = 'x'), 0)`,
				wall
					? gte(
							graffiti.createdAt,
							new Date(Date.now() - WALL_DAYS * 86_400_000),
						)
					: undefined,
			),
		)
		.orderBy(desc(graffiti.createdAt))
		.limit(VISIBLE);
	return rows.reverse();
}

// いま描ける壁か。持ち主が開けていて、運営が非表示にしていないページか会（下書きを除く）
export async function isWallOpen(db: Db, wall: string): Promise<boolean> {
	const owner = parseWallKey(wall);
	if (!owner) return false;
	const [row] =
		owner.type === "actor"
			? await db
					.select({ id: actors.id })
					.from(actors)
					.where(
						and(
							eq(actors.id, owner.id),
							eq(actors.wallOpen, true),
							isNull(actors.hiddenAt),
						),
					)
					.limit(1)
			: await db
					.select({ id: events.id })
					.from(events)
					.where(
						and(
							eq(events.id, owner.id),
							eq(events.wallOpen, true),
							isNull(events.hiddenAt),
							ne(events.status, "draft"),
						),
					)
					.limit(1);
	return row !== undefined;
}

// 壁をまるごと上塗りする。行は消さず、印を 1 行足すだけ（これより前の線は配らなくなる）
export async function overpaint(db: Db, wall: string): Promise<void> {
	await db.insert(graffiti).values({ wall, d: OVERPAINT });
}

// 壁を開ける・閉じる。閉じるときは上塗りもする（開け直したとき、前の落書きが出てこない）
export async function setWallOpen(
	db: Db,
	owner: WallOwner,
	open: boolean,
): Promise<void> {
	if (owner.type === "actor")
		await db
			.update(actors)
			.set({ wallOpen: open })
			.where(eq(actors.id, owner.id));
	else
		await db
			.update(events)
			.set({ wallOpen: open })
			.where(eq(events.id, owner.id));
	if (!open) await overpaint(db, wallKey(owner.type, owner.id));
}

// 運営の上塗り。対象（@handle か会）の壁を塗る。無い対象なら false
export async function overpaintTarget(
	db: Db,
	target: ModerationTarget,
): Promise<boolean> {
	const [row] =
		target.type === "actor"
			? await db
					.select({ id: actors.id })
					.from(actors)
					.where(eq(actors.handle, target.handle))
					.limit(1)
			: await db
					.select({ id: events.id })
					.from(events)
					.where(eq(events.id, target.id))
					.limit(1);
	if (!row) return false;
	await overpaint(db, wallKey(target.type, row.id));
	return true;
}
