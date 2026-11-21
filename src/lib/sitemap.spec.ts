import { describe, expect, it } from "vitest";
import { sitemapXml } from "./sitemap";

describe("sitemapXml", () => {
	it("パスを絶対 URL にし、直した日があれば日付で添える", () => {
		const xml = sitemapXml("https://magari.cc", [
			{ path: "/" },
			{ path: "/e/abc123defg", lastmod: new Date("2026-11-08T15:30:00Z") },
		]);
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain("<url><loc>https://magari.cc/</loc></url>");
		expect(xml).toContain(
			"<url><loc>https://magari.cc/e/abc123defg</loc><lastmod>2026-11-08</lastmod></url>",
		);
	});

	it("XML の区切りの字を逃がす", () => {
		const xml = sitemapXml("https://magari.cc", [
			{ path: "/calendar?a=1&b=<" },
		]);
		expect(xml).toContain(
			"<loc>https://magari.cc/calendar?a=1&amp;b=&lt;</loc>",
		);
	});
});
