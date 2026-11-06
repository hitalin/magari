// 紛らわしい文字（0/O, 1/l/I）を除いた 31 文字。10 文字で約 1.3×10^15 通り。
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function shortId(length = 10): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let out = "";
	for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
	return out;
}

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

// 予約語。ルーティングや将来の AP エンドポイントと衝突する名前を弾く。
const RESERVED = new Set([
	"me",
	"e",
	"api",
	"auth",
	"admin",
	"login",
	"logout",
	"signup",
	"settings",
	"about",
	"magari",
	"inbox",
	"outbox",
	"users",
	"actor",
]);

export function isValidHandle(handle: string): boolean {
	return HANDLE_PATTERN.test(handle) && !RESERVED.has(handle);
}
