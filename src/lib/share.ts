// X での共有文とリンクカードの説明。題・日時・場所（ハコ）を必ず入れる。
import { formatWhen } from './date';
import type { EventSummary } from './types';

type ShareEvent = Pick<
	EventSummary,
	'title' | 'startsAt' | 'endsAt' | 'allDay' | 'space' | 'locationName' | 'onlineUrl'
>;

// ハコ > 場所の名前 > オンライン
export function eventPlace(e: ShareEvent): string | null {
	return e.space?.name ?? e.locationName ?? (e.onlineUrl ? 'オンライン' : null);
}

export function eventShareText(e: ShareEvent): string {
	const place = eventPlace(e);
	return [e.title, formatWhen(e), place && `📍${place}`].filter(Boolean).join('\n');
}

// URLSearchParams は空白を + にするので使わない（X の投稿画面に + が残ることがある）
export function xShareUrl(text: string, url: string): string {
	return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
