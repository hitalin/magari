// 検索エンジン向けの sitemap.xml。載せるのは検索に出してよいページだけ（noindex のページは渡さない）。
export type SitemapEntry = { path: string; lastmod?: Date };

const escapeXml = (v: string) =>
	v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function sitemapXml(origin: string, entries: SitemapEntry[]): string {
	const urls = entries.map(
		({ path, lastmod }) =>
			`<url><loc>${escapeXml(origin + path)}</loc>${
				lastmod
					? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
					: ""
			}</url>`,
	);
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
