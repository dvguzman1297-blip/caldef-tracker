export type PickRow = {
  title: string; calories: number; protein_g: number | string; fiber_g: number | string;
  net_carbs_g: number | string; fat_g: number | string; date: string;
};
export type QuickPick = {
  title: string; calories: number; protein: number; fiber: number; netCarbs: number; fat: number;
  count: number; lastDate: string;
};

/**
 * Collapses logged meals into distinct foods (by case-insensitive title), keeping the most recent
 * numbers. `recent` is newest first; `frequent` needs 2+ logs and is most-logged first.
 */
export function buildPicks(rows: PickRow[], limit = 8): { recent: QuickPick[]; frequent: QuickPick[] } {
  const byTitle = new Map<string, QuickPick>();
  for (const r of rows) {
    const key = r.title.trim().toLowerCase();
    if (!key) continue;
    const prev = byTitle.get(key);
    const newer = !prev || r.date >= prev.lastDate;
    byTitle.set(key, {
      title: newer ? r.title.trim() : prev.title,
      calories: newer ? r.calories : prev.calories,
      protein: newer ? Number(r.protein_g) : prev.protein,
      fiber: newer ? Number(r.fiber_g) : prev.fiber,
      netCarbs: newer ? Number(r.net_carbs_g) : prev.netCarbs,
      fat: newer ? Number(r.fat_g) : prev.fat,
      count: (prev?.count ?? 0) + 1,
      lastDate: newer ? r.date : prev.lastDate,
    });
  }
  const all = [...byTitle.values()];
  const recent = [...all].sort((a, b) => b.lastDate.localeCompare(a.lastDate)).slice(0, limit);
  const frequent = all.filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate)).slice(0, limit);
  return { recent, frequent };
}
