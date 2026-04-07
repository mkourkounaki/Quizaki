import confetti from 'canvas-confetti';

/**
 * Σωστή απάντηση: κύρια ρίψη όπως ζητήθηκε + επαναλήψεις/πλευρικές για χαρτοπόλεμο / σερπαντίνες.
 */
export function fireCorrectAnswerConfetti(): void {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });

  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, 260);

  setTimeout(() => {
    confetti({ particleCount: 72, spread: 58, origin: { x: 0.1, y: 0.62 }, angle: 55 });
    confetti({ particleCount: 72, spread: 58, origin: { x: 0.9, y: 0.62 }, angle: 125 });
  }, 130);
}
