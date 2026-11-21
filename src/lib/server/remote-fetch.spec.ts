import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_BODY_BYTES, remoteJson } from "./remote-fetch";

const stub = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
	const fn = vi.fn(impl);
	vi.stubGlobal("fetch", fn);
	return fn;
};

describe("remoteJson", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("JSON を返す。リダイレクトは追わせず、時間を切る", async () => {
		const fn = stub(async () => Response.json({ version: "2026.1.0" }));
		expect(await remoteJson("https://mi.example/api/meta")).toEqual({
			version: "2026.1.0",
		});
		const init = fn.mock.calls[0][1];
		expect(init?.redirect).toBe("manual");
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it("渡したメソッド・ヘッダー・本文はそのまま送る", async () => {
		const fn = stub(async () => Response.json({}));
		await remoteJson("https://mi.example/x", {
			method: "POST",
			headers: { "user-agent": "magari" },
			body: "{}",
		});
		expect(fn.mock.calls[0][1]).toMatchObject({
			method: "POST",
			headers: { "user-agent": "magari" },
			body: "{}",
		});
	});

	it("リダイレクトと失敗の応答は null", async () => {
		stub(
			async () =>
				new Response(null, {
					status: 307,
					headers: { location: "http://10.0.0.1/" },
				}),
		);
		expect(await remoteJson("https://mi.example/x")).toBeNull();
		stub(async () => new Response("no", { status: 404 }));
		expect(await remoteJson("https://mi.example/x")).toBeNull();
	});

	it("つながらない・時間切れは null", async () => {
		stub(async () => {
			throw new DOMException("timeout", "TimeoutError");
		});
		expect(await remoteJson("https://mi.example/x")).toBeNull();
	});

	it("JSON でなければ null", async () => {
		stub(async () => new Response("<html>"));
		expect(await remoteJson("https://mi.example/x")).toBeNull();
	});

	it("本文が上限を越えたら、読み切らずに null", async () => {
		let pulled = 0;
		const chunk = new Uint8Array(64 * 1024).fill(0x20);
		stub(
			async () =>
				new Response(
					new ReadableStream({
						pull(c) {
							pulled++;
							c.enqueue(chunk);
						},
					}),
				),
		);
		expect(await remoteJson("https://mi.example/x")).toBeNull();
		// 流し続ける相手でも、上限の少し先で止まる
		expect(pulled * chunk.length).toBeLessThan(MAX_BODY_BYTES * 2);
	});
});
