import type { ActorRef, EventSummary } from "./types";

export type ListItem =
	| { kind: "event"; event: EventSummary }
	| { kind: "group"; actor: ActorRef; events: EventSummary[] };

export const primaryActor = (e: EventSummary): ActorRef | null =>
	e.hosts[0] ?? e.space ?? null;

// 同じ主催者の会が 1 日に多数ある（まとめサイトの取り込みなど）ときは 1 行に畳む。
export function collapseByActor(
	events: EventSummary[],
	threshold = 4,
): ListItem[] {
	const counts = new Map<string, number>();
	for (const e of events) {
		const a = primaryActor(e);
		if (a) counts.set(a.handle, (counts.get(a.handle) ?? 0) + 1);
	}
	const out: ListItem[] = [];
	const groups = new Map<string, ListItem & { kind: "group" }>();
	for (const e of events) {
		const a = primaryActor(e);
		if (a && (counts.get(a.handle) ?? 0) >= threshold) {
			let g = groups.get(a.handle);
			if (!g) {
				g = { kind: "group", actor: a, events: [] };
				groups.set(a.handle, g);
				out.push(g);
			}
			g.events.push(e);
		} else {
			out.push({ kind: "event", event: e });
		}
	}
	return out;
}
