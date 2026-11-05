import type { Auth } from '#lib/server/auth.ts';
import type { Db } from '#lib/server/db/index.ts';
import type { MyActor } from '#lib/server/me.ts';

declare global {
	namespace App {
		interface Locals {
			db: Db;
			auth: Auth;
			session: Auth['$Infer']['Session'] | null;
			// ログインユーザー本人の Person アクター（未登録なら null）
			actor: MyActor | null;
		}
	}
}

export {};
