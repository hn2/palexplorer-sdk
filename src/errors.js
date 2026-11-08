export class PalexplorerError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'PalexplorerError';
    this.status = status;
    Object.defineProperty(this, 'body', { value: body, enumerable: false, writable: false });
  }
}
