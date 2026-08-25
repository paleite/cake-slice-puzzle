export type RandomResult = {
  value: number;
  seed: number;
};

export function nextRandom(seed: number): RandomResult {
  let nextSeed = seed >>> 0;
  nextSeed += 0x6d2b79f5;
  let value = nextSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return {
    value: ((value ^ (value >>> 14)) >>> 0) / 4294967296,
    seed: nextSeed >>> 0,
  };
}

export function randomInteger(seed: number, minimum: number, maximumInclusive: number) {
  const result = nextRandom(seed);
  const value = Math.floor(result.value * (maximumInclusive - minimum + 1)) + minimum;
  return { value, seed: result.seed };
}
