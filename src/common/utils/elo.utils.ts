export function updateElo(ratingA: number, ratingB: number, resultA: number, k = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  return {
    newA: ratingA + k * (resultA - expectedA),
    newB: ratingB + k * ((1 - resultA) - expectedB),
  };
}
