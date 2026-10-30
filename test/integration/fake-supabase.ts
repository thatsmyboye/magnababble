/**
 * A tiny PostgREST stand-in for integration tests: implements the subset of
 * the supabase-js query builder the engine uses, translating each call to
 * SQL against a real Postgres (so the migrations, constraints and functions
 * are exercised for real). Not a general-purpose client.
 */
import { Pool } from "pg";

type Row = Record<string, unknown>;
type Filter = { col: string; op: "=" | ">"; value: unknown };

/** Embedded resources: (table, alias) -> join target. */
const EMBEDS: Record<string, Record<string, { table: string; fk: string }>> = {
  rounds: { prompts: { table: "prompts", fk: "prompt_id" }, rooms: { table: "rooms", fk: "room_id" } },
  player_hands: { tiles: { table: "tiles", fk: "tile_id" } },
};

interface Result<T = unknown> {
  data: T;
  error: { code?: string; message: string } | null;
  count: number | null;
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

class FakeBuilder implements PromiseLike<Result> {
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private columns = "*";
  private countMode: "exact" | null = null;
  private headOnly = false;
  private payload: Row | Row[] | null = null;
  private onConflict: string | null = null;
  private filters: Filter[] = [];
  private orderBy: string | null = null;
  private returning = false;
  private singleMode: "single" | "maybe" | null = null;

  constructor(private pool: Pool, private table: string) {}

  select(columns = "*", opts: { count?: "exact"; head?: boolean } = {}) {
    if (this.action === "select") {
      this.columns = columns;
      this.countMode = opts.count ?? null;
      this.headOnly = Boolean(opts.head);
    } else {
      this.returning = true;
      this.columns = columns;
    }
    return this;
  }
  insert(rows: Row | Row[]) {
    this.action = "insert";
    this.payload = rows;
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string } = {}) {
    this.action = "upsert";
    this.payload = rows;
    this.onConflict = opts.onConflict ?? null;
    return this;
  }
  update(values: Row) {
    this.action = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push({ col, op: "=", value });
    return this;
  }
  gt(col: string, value: unknown) {
    this.filters.push({ col, op: ">", value });
    return this;
  }
  order(col: string) {
    this.orderBy = col;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<R1 = Result, R2 = never>(onfulfilled?: ((v: Result) => R1 | PromiseLike<R1>) | null, onrejected?: ((e: any) => R2 | PromiseLike<R2>) | null) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private selectList(): string {
    const parts = splitTopLevel(this.columns);
    return parts
      .map((part) => {
        const m = /^(\w+)\((.*)\)$/.exec(part);
        if (!m) return `"${this.table}".${part === "*" ? "*" : `"${part}"`}`;
        const embed = EMBEDS[this.table]?.[m[1]];
        if (!embed) throw new Error(`Unknown embed ${this.table}.${m[1]}`);
        const inner = m[2]
          .split(",")
          .map((c) => `"${c.trim()}"`)
          .join(", ");
        return `(SELECT row_to_json(e) FROM (SELECT ${inner} FROM "${embed.table}" WHERE "${embed.table}".id = "${this.table}"."${embed.fk}") e) AS "${m[1]}"`;
      })
      .join(", ");
  }

  private whereClause(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const clauses = this.filters.map((f) => {
      params.push(f.value);
      return `"${f.col}" ${f.op} $${params.length}`;
    });
    return ` WHERE ${clauses.join(" AND ")}`;
  }

  private async execute(): Promise<Result> {
    const params: unknown[] = [];
    let sql: string;

    try {
      switch (this.action) {
        case "select": {
          if (this.countMode && this.headOnly) {
            sql = `SELECT count(*)::int AS n FROM "${this.table}"${this.whereClause(params)}`;
            const { rows } = await this.pool.query(sql, params);
            return { data: null, error: null, count: rows[0].n };
          }
          sql = `SELECT ${this.selectList()} FROM "${this.table}"${this.whereClause(params)}`;
          if (this.orderBy) sql += ` ORDER BY "${this.orderBy}"`;
          break;
        }
        case "insert":
        case "upsert": {
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
          if (rows.length === 0) return { data: [], error: null, count: null };
          const cols = Object.keys(rows[0]);
          const values = rows
            .map(
              (r) =>
                `(${cols
                  .map((c) => {
                    const v = r[c];
                    params.push(Array.isArray(v) || (v && typeof v === "object") ? JSON.stringify(v) : v);
                    return `$${params.length}`;
                  })
                  .join(", ")})`
            )
            .join(", ");
          sql = `INSERT INTO "${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${values}`;
          if (this.action === "upsert" && this.onConflict) {
            const conflictCols = this.onConflict.split(",").map((c) => `"${c.trim()}"`).join(", ");
            const updates = cols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
            sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`;
          }
          if (this.returning) sql += ` RETURNING ${this.selectList()}`;
          break;
        }
        case "update": {
          const values = this.payload as Row;
          const sets = Object.keys(values).map((c) => {
            params.push(values[c]);
            return `"${c}" = $${params.length}`;
          });
          sql = `UPDATE "${this.table}" SET ${sets.join(", ")}${this.whereClause(params)}`;
          if (this.returning) sql += ` RETURNING ${this.selectList()}`;
          break;
        }
        case "delete": {
          sql = `DELETE FROM "${this.table}"${this.whereClause(params)}`;
          if (this.returning) sql += ` RETURNING ${this.selectList()}`;
          break;
        }
      }

      const { rows } = await this.pool.query(sql, params);
      const wantsRows = this.action === "select" || this.returning;
      if (!wantsRows) return { data: null, error: null, count: null };

      if (this.singleMode === "single") {
        if (rows.length !== 1) {
          return { data: null, error: { code: "PGRST116", message: `Expected 1 row, got ${rows.length}` }, count: null };
        }
        return { data: rows[0], error: null, count: null };
      }
      if (this.singleMode === "maybe") {
        return { data: rows[0] ?? null, error: null, count: null };
      }
      return { data: rows, error: null, count: this.countMode ? rows.length : null };
    } catch (err) {
      const e = err as { code?: string; message: string };
      return { data: null, error: { code: e.code, message: e.message }, count: null };
    }
  }
}

export class FakeSupabase {
  constructor(private pool: Pool) {}

  from(table: string) {
    return new FakeBuilder(this.pool, table);
  }

  async rpc(name: string, args: Record<string, unknown> = {}): Promise<Result> {
    const keys = Object.keys(args);
    const params = keys.map((k) => args[k]);
    const argList = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
    try {
      const { rows } = await this.pool.query(`SELECT ${name}(${argList}) AS result`, params);
      return { data: rows[0]?.result ?? null, error: null, count: null };
    } catch (err) {
      const e = err as { code?: string; message: string };
      return { data: null, error: { code: e.code, message: e.message }, count: null };
    }
  }
}
