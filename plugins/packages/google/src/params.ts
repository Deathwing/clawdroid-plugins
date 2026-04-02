export class MissingParameterError extends Error {
  readonly parameter: string;

  constructor(parameter: string) {
    super(`Missing '${parameter}' parameter`);
    this.name = "MissingParameterError";
    this.parameter = parameter;
  }
}

export function requiredString(input: Record<string, unknown>, name: string): string {
  const value = input[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MissingParameterError(name);
  }
  return value.trim();
}

export function optionalString(input: Record<string, unknown>, name: string): string | undefined {
  const value = input[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalInteger(input: Record<string, unknown>, name: string, defaultValue: number): number {
  const value = input[name];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}