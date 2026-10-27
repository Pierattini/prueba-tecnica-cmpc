export type JsonPrimitive = string | number | boolean | null;
export type FieldChange = { from: JsonPrimitive; to: JsonPrimitive };

type Comparable = JsonPrimitive | Date | undefined;

const normalize = (value: Comparable): JsonPrimitive =>
  value instanceof Date ? value.toISOString() : (value ?? null);

// solo se guardan los campos que realmente cambiaron
export function diffFields<T extends Record<string, Comparable>>(
  before: T,
  after: T,
  fields: (keyof T & string)[],
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (from !== to) changes[field] = { from, to };
  }
  return changes;
}
