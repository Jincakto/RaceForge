// Prototype-only IDs. Connected API flows must use the integer ID returned by the server.
let nextId = 1_000_000;

export function newDemoId(): number {
  if (nextId > 2_147_483_647) throw new Error('Demo ID range exhausted');
  return nextId++;
}
