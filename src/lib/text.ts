// 紹介文やお知らせの簡易記法。HTML は一切通さず、構造だけ返して Svelte 側で描画する。
export type Block =
	| { type: "h2"; text: string }
	| { type: "p"; lines: string[] }
	| { type: "ul"; items: string[] };

export function parseBlocks(text: string | null | undefined): Block[] {
	if (!text) return [];
	const blocks: Block[] = [];
	let para: string[] = [];
	let list: string[] = [];
	const flush = () => {
		if (para.length) blocks.push({ type: "p", lines: para });
		if (list.length) blocks.push({ type: "ul", items: list });
		para = [];
		list = [];
	};
	for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
		const line = raw.trim();
		if (!line) {
			flush();
		} else if (line.startsWith("## ")) {
			flush();
			blocks.push({ type: "h2", text: line.slice(3).trim() });
		} else if (line.startsWith("- ")) {
			if (para.length) flush();
			list.push(line.slice(2).trim());
		} else {
			if (list.length) flush();
			para.push(line);
		}
	}
	flush();
	return blocks;
}
