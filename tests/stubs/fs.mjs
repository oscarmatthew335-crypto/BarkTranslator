export class File { constructor() { this.exists = false; } delete() {} write() {} }
export class Directory { constructor() { this.exists = true; } create() {} list() { return []; } }
export const Paths = { document: {}, cache: {} };
