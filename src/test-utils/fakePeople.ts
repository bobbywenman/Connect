// In-memory stand-in for the `persons` and `network_members` tables, for api tests.
// It layers over the global supabase mock: install() routes those two tables here and
// leaves everything else (profiles, custom types) to the original fake. RLS is not simulated.
import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;
type Op = 'select' | 'insert' | 'update' | 'delete';
type Filter =
  | { column: string; values: unknown[] }
  | { anyOf: { column: string; value: string }[] }
  // Compares strings (ISO timestamps sort correctly as strings).
  | { column: string; gte: string };

const OWNER = '00000000-0000-0000-0000-000000000001';

export function createFakePeople() {
  const tables: Record<string, Row[]> = {
    persons: [],
    network_members: [],
    relationships: [],
    networks: [],
    duplicate_dismissals: [],
    event_persons: [],
  };
  const failures: { table: string; op: Op; error: Error }[] = [];
  let nextId = 1;
  const calls: { table: string; op: Op }[] = [];

  function execute(
    table: string,
    op: Op,
    values: unknown,
    filters: Filter[],
    columns: string,
    orderBy?: { column: string; ascending: boolean },
  ) {
    calls.push({ table, op });
    const failure = failures.find((f) => f.table === table && f.op === op);
    if (failure) return { data: null, error: failure.error };

    const rows = tables[table]!;
    const matches = (r: Row) =>
      filters.every((f) => {
        if ('anyOf' in f) return f.anyOf.some((c) => String(r[c.column]) === c.value);
        if ('gte' in f) return String(r[f.column] ?? '') >= f.gte;
        // Filter on an embedded table, e.g. `network_members.network_id` with `!inner`.
        if (f.column.startsWith('network_members.')) {
          const column = f.column.slice('network_members.'.length);
          return tables.network_members!.some(
            (m) => m.person_id === r.id && f.values.includes(m[column]),
          );
        }
        // `.is(column, null)` also matches columns the fake never set.
        const value = r[f.column] === undefined ? null : r[f.column];
        return f.values.includes(value);
      });

    if (op === 'insert' && table === 'duplicate_dismissals') {
      // The table's check (a < b) and primary key (owner, a, b).
      const row: Row = { owner_id: OWNER, ...(values as Row) };
      if (!((row.person_a_id as string) < (row.person_b_id as string))) {
        return { data: null, error: { code: '23514', message: 'check violation' } };
      }
      if (
        rows.some((r) => r.person_a_id === row.person_a_id && r.person_b_id === row.person_b_id)
      ) {
        return { data: null, error: { code: '23505', message: 'duplicate key' } };
      }
      rows.push(row);
      return { data: [row], error: null };
    }
    if (op === 'insert') {
      const inserted = (Array.isArray(values) ? values : [values]).map((v) => {
        const row: Row = { id: `${table}-${nextId++}`, owner_id: OWNER, ...(v as Row) };
        if (table === 'persons') {
          row.tags ??= [];
          row.is_self ??= false;
        }
        return row;
      });
      rows.push(...inserted);
      return { data: inserted, error: null };
    }
    if (op === 'update') {
      const updated = rows.filter(matches);
      updated.forEach((r) => Object.assign(r, values));
      return { data: updated, error: null };
    }
    if (op === 'delete') {
      const removed = rows.filter(matches);
      tables[table] = rows.filter((r) => !matches(r));
      if (table === 'persons') {
        // on delete cascade
        const gone = new Set(removed.map((r) => r.id));
        tables.network_members = tables.network_members!.filter((m) => !gone.has(m.person_id));
        tables.relationships = tables.relationships!.filter(
          (rel) => !gone.has(rel.source_person_id) && !gone.has(rel.target_person_id),
        );
      }
      return { data: removed, error: null };
    }
    let selected = rows.filter(matches).map((r) => ({ ...r }));
    if (orderBy) {
      const { column, ascending } = orderBy;
      const sign = ascending ? 1 : -1;
      selected.sort(
        (a, b) => sign * String(a[column] ?? '').localeCompare(String(b[column] ?? '')),
      );
    }
    if (table === 'persons' && columns.includes('network_members')) {
      // `network_members(networks(...))` embeds the network rows; plain `network_members(network_id)` does not.
      const nested = columns.includes('networks(');
      selected = selected.map((r) => ({
        ...r,
        network_members: tables
          .network_members!.filter((m) => m.person_id === r.id)
          .map((m) =>
            nested
              ? { networks: tables.networks!.find((n) => n.id === m.network_id) ?? null }
              : { network_id: m.network_id },
          ),
      }));
    }
    if (table === 'network_members' && columns.includes('networks(')) {
      selected = selected.map((m) => ({
        ...m,
        networks: tables.networks!.find((n) => n.id === m.network_id) ?? null,
      }));
    }
    return { data: selected, error: null };
  }

  function builder(table: string) {
    let op: Op = 'select';
    let values: unknown;
    let columns = '*';
    let orderBy: { column: string; ascending: boolean } | undefined;
    const filters: Filter[] = [];
    const run = () => execute(table, op, values, filters, columns, orderBy);
    const one = (required: boolean) => {
      const res = run();
      if (res.error) return res;
      const list = res.data as Row[];
      if (list.length === 0 && required) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      }
      return { data: list[0] ?? null, error: null };
    };
    const b = {
      select(cols = '*') {
        // After insert/update/delete, select() only changes what is returned.
        if (op === 'select') columns = cols;
        return b;
      },
      insert(v: unknown) {
        op = 'insert';
        values = v;
        return b;
      },
      update(v: unknown) {
        op = 'update';
        values = v;
        return b;
      },
      delete() {
        op = 'delete';
        return b;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, values: [value] });
        return b;
      },
      is(column: string, value: unknown) {
        filters.push({ column, values: [value] });
        return b;
      },
      or(expression: string) {
        // Only the `column.eq.value,column.eq.value` form is supported.
        const anyOf = expression.split(',').map((part) => {
          const [column, , value] = part.split('.');
          return { column: column!, value: value! };
        });
        filters.push({ anyOf });
        return b;
      },
      in(column: string, vals: unknown[]) {
        filters.push({ column, values: vals });
        return b;
      },
      gte(column: string, value: string) {
        filters.push({ column, gte: value });
        return b;
      },
      order(column: string, options: { ascending?: boolean } = {}) {
        orderBy = { column, ascending: options.ascending ?? true };
        return b;
      },
      single: async () => one(true),
      maybeSingle: async () => one(false),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(resolve, reject),
    };
    return b;
  }

  return {
    tables,
    calls,
    /** Make the next-and-all calls of `op` on `table` fail with `error`. */
    failOn(table: string, op: Op, error: Error) {
      failures.push({ table, op, error });
    },
    /** Seed a person (and optional memberships) directly. */
    seedPerson(row: Row, networkIds: string[] = []) {
      const id = (row.id as string) ?? `persons-${nextId++}`;
      tables.persons!.push({ owner_id: OWNER, is_self: false, tags: [], ...row, id });
      networkIds.forEach((network_id) =>
        tables.network_members!.push({ network_id, person_id: id, owner_id: OWNER }),
      );
      return id;
    },
    /** Seed a network row (for membership embeds). */
    seedNetwork(row: Row) {
      tables.networks!.push({ owner_id: OWNER, color: null, ...row });
      return row.id as string;
    },
    /** Seed a relationship row. */
    seedRelationship(row: Row) {
      const id = (row.id as string) ?? `relationships-${nextId++}`;
      tables.relationships!.push({
        owner_id: OWNER,
        custom_label: null,
        inverse_custom_label: null,
        ...row,
        id,
      });
      return id;
    },
    /** Route persons/network_members through this fake; returns an uninstall function. */
    install() {
      const from = supabase.from as unknown as jest.Mock;
      const original = from.getMockImplementation();
      from.mockImplementation((table: string) =>
        table in tables ? builder(table) : original?.(table),
      );
      return () => {
        if (original) from.mockImplementation(original);
      };
    },
  };
}
