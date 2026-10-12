// Local-only IDs never get sent as persisted backend IDs.
let sequence = Date.now();
export const demoId = () => ++sequence;
