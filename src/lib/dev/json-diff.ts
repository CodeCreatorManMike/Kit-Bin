export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface JsonDifference {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: JsonValue;
  after?: JsonValue;
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function childPath(parent: string, key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return parent === '$' ? `$.${key}` : `${parent}.${key}`;
  return `${parent}[${JSON.stringify(key)}]`;
}

export function findJsonDifferences(
  before: JsonValue,
  after: JsonValue,
  path = '$',
): JsonDifference[] {
  if (Object.is(before, after)) return [];

  if (Array.isArray(before) && Array.isArray(after)) {
    const differences: JsonDifference[] = [];
    const longest = Math.max(before.length, after.length);
    for (let index = 0; index < longest; index++) {
      const itemPath = `${path}[${index}]`;
      if (index >= before.length) differences.push({ path: itemPath, kind: 'added', after: after[index] });
      else if (index >= after.length) differences.push({ path: itemPath, kind: 'removed', before: before[index] });
      else differences.push(...findJsonDifferences(before[index]!, after[index]!, itemPath));
    }
    return differences;
  }

  if (isRecord(before) && isRecord(after)) {
    const differences: JsonDifference[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      const itemPath = childPath(path, key);
      if (!(key in before)) differences.push({ path: itemPath, kind: 'added', after: after[key] });
      else if (!(key in after)) differences.push({ path: itemPath, kind: 'removed', before: before[key] });
      else differences.push(...findJsonDifferences(before[key]!, after[key]!, itemPath));
    }
    return differences;
  }

  return [{ path, kind: 'changed', before, after }];
}

export function jsonPreview(value: JsonValue | undefined): string {
  if (value === undefined) return '—';
  const serialized = JSON.stringify(value);
  return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized;
}
