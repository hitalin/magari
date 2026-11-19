import { DurableObject } from "cloudflare:workers";
import { parseStrokes } from "#lib/graffiti.ts";

// 1 通の長さ（描いている途中の点を小分けに送るので、短い）と、同じ接続から 1 秒に受ける数
const MAX_LENGTH = 4000;
const MAX_PER_SECOND = 40;
const MAX_SOCKETS = 2000;

// 地面を見ている人どうしで、いま描いている線を配る（絵チャのように、描くそばから人の画面に出る）。
// 配るだけで、何も保存しない（残すのは POST /api/graffiti）。誰の線かも持たず、接続ごとの使い捨ての番号だけ付ける。
// 地面は 1 枚なので、部屋も 1 つ（worker.ts が "ground" の名前で呼ぶ）。
// 誰も描いていない間は眠る（Hibernation）ので、つないだままの人が何人いても時間は課金されない
export class GraffitiRoom extends DurableObject<Env> {
	// 接続ごとの、この 1 秒に受けた数（眠ると消えるが、眠るのは誰も送っていないとき）
	private counts = new WeakMap<WebSocket, { second: number; n: number }>();

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("upgrade") !== "websocket")
			return new Response(null, { status: 426 });
		if (this.ctx.getWebSockets().length >= MAX_SOCKETS)
			return new Response(null, { status: 503 });
		const [client, server] = Object.values(new WebSocketPair());
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment(crypto.randomUUID().slice(0, 8));
		return new Response(null, { status: 101, webSocket: client });
	}

	// 届くのは「線の番号 + 線 1 本ぶん（src/lib/graffiti.ts の形）」。形を確かめて、送り主の番号を付けてほかの全員へ
	webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		const second = Math.floor(Date.now() / 1000);
		const count = this.counts.get(ws);
		if (count?.second === second) {
			if (++count.n > MAX_PER_SECOND) ws.close(1008, "too many messages");
		} else this.counts.set(ws, { second, n: 1 });

		if (typeof message !== "string" || message.length > MAX_LENGTH) return;
		const m = /^(\d{1,6}) ([^;]+)$/.exec(message);
		if (!m || !parseStrokes(m[2])) return;
		const out = `${ws.deserializeAttachment()}-${m[1]} ${m[2]}`;
		for (const other of this.ctx.getWebSockets()) {
			if (other === ws) continue;
			try {
				other.send(out);
			} catch {
				// 切れかけの相手は飛ばす
			}
		}
	}

	webSocketClose(ws: WebSocket) {
		ws.close();
	}
}
