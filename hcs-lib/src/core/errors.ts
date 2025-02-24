/**
 * Error thrown when a circular reference is detected in schema or model resolution.
 */
export class CircularRefError extends Error {
  constructor(referencePath: string) {
    super(`${referencePath}`);
    this.name = "CircularRefError";
    Object.setPrototypeOf(this, CircularRefError.prototype);
  }
}

/**
 * Error thrown when a schema or model reference cannot be resolved.
 */
export class UnresolvedRefError extends Error {
  constructor(referenceId: string) {
    super(`${referenceId}`);
    this.name = "UnresolvedRefError";
    Object.setPrototypeOf(this, UnresolvedRefError.prototype);
  }
}
