export class ApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export function requireRule(condition: unknown, message: string, status = 409): asserts condition {
  if (!condition) throw new ApiError(status, message)
}
