import { Fragment } from "react";

type Macros = { protein: number; netCarbs: number; fat: number; fiber?: number };

/** 1 decimal at most, no trailing ".0" (38.20 -> 38.2, 4.0 -> 4). */
const g = (v: number) => `${Number(Number(v).toFixed(1))}g`;

/**
 * One line of macros: "37.2g P · 0g Net Carbs · 4.3g Fat · 0g Fiber".
 * `short` abbreviates net carbs to NC (for tight headers); every abbreviation carries its full name for assistive tech.
 */
export function MacroLine({ short = false, ...m }: Macros & { short?: boolean }) {
  const parts: { key: string; value: number; label: string; title: string }[] = [
    { key: "p", value: m.protein, label: "P", title: "Protein" },
    { key: "nc", value: m.netCarbs, label: short ? "NC" : "Net Carbs", title: "Net carbs" },
    { key: "fat", value: m.fat, label: "Fat", title: "Fat" },
    ...(m.fiber === undefined ? [] : [{ key: "fiber", value: m.fiber, label: "Fiber", title: "Fiber" }]),
  ];
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={p.key}>
          {i > 0 && <span aria-hidden="true">·</span>}
          <span className="whitespace-nowrap tabular-nums">
            {g(p.value)} <abbr title={p.title} className="no-underline">{p.label}</abbr>
          </span>
        </Fragment>
      ))}
    </>
  );
}
