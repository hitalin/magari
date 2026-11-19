// X で共有したときのカード画像（og:image）。会ごとに 1200×630 の画像を /e/{id}/og.png が作る。
import { formatWhen } from "./date";
import { hash } from "./flyer";
import { eventPlace } from "./share";
import type { EventDetail } from "./types";

type CardEvent = Pick<
	EventDetail,
	| "id"
	| "title"
	| "startsAt"
	| "endsAt"
	| "allDay"
	| "space"
	| "locationName"
	| "onlineUrl"
	| "hosts"
	| "flyerUrl"
	| "flyerLook"
	| "status"
>;

// カードの絵柄を変えたら上げる（作り置きの画像を全部作り直す）
const DESIGN = 3;

// カードに出るものから決まる版。変わったら画像を作り直す
export function cardVersion(e: CardEvent): string {
	return hash(
		JSON.stringify([
			DESIGN,
			e.title,
			formatWhen(e),
			e.startsAt,
			eventPlace(e),
			e.hosts[0]?.name ?? null,
			e.flyerUrl,
			e.flyerLook,
			e.status,
		]),
	).toString(36);
}

// 版を URL に入れる（X は画像を URL ごとに覚えるので、編集したら取り直させる）
export function cardImagePath(e: CardEvent): string {
	return `/e/${e.id}/og.png?v=${cardVersion(e)}`;
}
