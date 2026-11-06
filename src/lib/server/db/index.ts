import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// drizzle の型は D1Database しか受けないが、Session も prepare/batch を持つので実行時は問題ない。
export const getDb = (d1: D1Database | D1DatabaseSession) =>
	drizzle(d1 as unknown as D1Database, { schema });

export type Db = ReturnType<typeof getDb>;
