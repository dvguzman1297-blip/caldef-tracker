export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 500; // matches the logWeight server action

/** Parses user input ("124.5", "124,5") into kg, or an error message suitable for inline display. */
export function parseWeight(input: string): { ok: true; kg: number } | { ok: false; error: string } {
  const raw = input.trim().replace(",", ".");
  if (!raw) return { ok: false, error: "Enter your weight" };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, error: "Use numbers only, like 124.5" };
  const kg = Math.round(Number(raw) * 10) / 10;
  if (kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG) {
    return { ok: false, error: `Enter a weight between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg` };
  }
  return { ok: true, kg };
}

/** Signed change in kg, rounded to 0.1, e.g. -0.3. */
export const weightChange = (previous: number, current: number) => Math.round((current - previous) * 10) / 10;

/** "+0.4 kg", "−0.3 kg", "no change". Uses a real minus sign. */
export const formatChange = (delta: number) =>
  delta === 0 ? "no change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} kg`;
