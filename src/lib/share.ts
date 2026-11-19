// X・Misskey での共有文とリンクカードの説明。題・日時・場所（ハコ）を必ず入れる。
import { formatWhen } from "./date";
import { HANDLE_PATTERN } from "./id";
import type { EventSummary, ShareMention } from "./types";

type ShareEvent = Pick<
	EventSummary,
	| "title"
	| "startsAt"
	| "endsAt"
	| "allDay"
	| "space"
	| "locationName"
	| "onlineUrl"
>;

// ハコ > 場所の名前 > オンライン
export function eventPlace(e: ShareEvent): string | null {
	return e.space?.name ?? e.locationName ?? (e.onlineUrl ? "オンライン" : null);
}

export function eventShareText(e: ShareEvent): string {
	const place = eventPlace(e);
	return [e.title, formatWhen(e), place && `📍${place}`]
		.filter(Boolean)
		.join("\n");
}

// URLSearchParams は空白を + にするので使わない（X の投稿画面に + が残ることがある）
export function xShareUrl(text: string, url: string): string {
	return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

// Misskey はサーバーが人ごとに違うので、Misskey Hub の共有ページでサーバーを選んでもらう
export function misskeyShareUrl(text: string, url: string): string {
	return `https://misskey-hub.net/share/?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

// 文中の @name（前が英数字ならメールアドレスなどなので除く）。後ろに @host が続けば 2 つめの括弧に入る
const MENTION_RE = /(?<![A-Za-z0-9])@([A-Za-z0-9_-]+)(@[A-Za-z0-9.-]+)?/g;

// 共有文の中の、まがりの ID かもしれない @name（ホスト付きは除く）
export function mentionHandles(text: string): string[] {
	const handles = [...text.matchAll(MENTION_RE)]
		.filter((m) => !m[2])
		.map((m) => m[1].toLowerCase())
		.filter((h) => HANDLE_PATTERN.test(h));
	return [...new Set(handles)];
}

// Misskey はホストの無い @name を自分のサーバーの人へのメンションにしてしまう。
// まがりにいる人なら、その人の Fediverse のアカウントへのメンションか、X へのリンクに置き換える。
// 分からなければ、いちばん人の多い misskey.io の人とみなす
export function misskeyShareText(
	text: string,
	mentions: ShareMention[],
): string {
	return text.replace(MENTION_RE, (whole, name: string, host?: string) => {
		if (host) return whole;
		const to = mentions.find((m) => m.handle === name.toLowerCase());
		if (to?.fediverse) return to.fediverse;
		if (to?.x) return `[@\u200B${to.x}](https://x.com/${to.x})`;
		return `@${name}@misskey.io`;
	});
}

// 題の中の @name をリンクに分ける。まがりにいる人はその人のページへ。
// いなければ X のプロフィールへ（取り込んだ会の題は X の ID で書かれている）
export function mentionParts(
	text: string,
	mentions: ShareMention[],
): { text: string; href: string | null }[] {
	const parts: { text: string; href: string | null }[] = [];
	let rest = 0;
	for (const m of text.matchAll(MENTION_RE)) {
		const [whole, name, host] = m;
		let href: string | null = null;
		if (!host) {
			if (mentions.some((to) => to.handle === name.toLowerCase()))
				href = `/@${name.toLowerCase()}`;
			else if (/^[A-Za-z0-9_]{1,15}$/.test(name))
				href = `https://x.com/${name}`;
		}
		if (!href) continue;
		if (m.index > rest)
			parts.push({ text: text.slice(rest, m.index), href: null });
		parts.push({ text: whole, href });
		rest = m.index + whole.length;
	}
	if (rest < text.length) parts.push({ text: text.slice(rest), href: null });
	return parts;
}
