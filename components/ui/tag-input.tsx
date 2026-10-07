"use client";
import { useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  maxTagLength?: number;
  error?: string;
};

/**
 * Chip input. Enter or comma commits the text as a chip (pasted lists split on commas/newlines),
 * Backspace on an empty field removes the last chip, blur commits what's typed.
 * Space is deliberately not a delimiter: ingredients like "chicken breast" contain spaces.
 */
export function TagInput({
  value, onChange, label, placeholder, suggestions = [], maxTags = 15, maxTagLength = 30, error,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState("");
  const [notice, setNotice] = useState("");
  const full = value.length >= maxTags;

  function add(raw: string[]) {
    const seen = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    const notes: string[] = [];
    for (const part of raw) {
      const clean = part.trim().replace(/\s+/g, " ");
      const t = clean.slice(0, maxTagLength);
      if (!t) continue;
      if (seen.has(t.toLowerCase())) { notes.push(`“${t}” is already in your list.`); continue; }
      if (next.length >= maxTags) { notes.push(`You can add up to ${maxTags} ingredients. Remove one to add another.`); break; }
      if (clean.length > maxTagLength) notes.push(`“${t}” was shortened to ${maxTagLength} characters.`);
      seen.add(t.toLowerCase()); next.push(t);
    }
    setNotice(notes[0] ?? "");
    if (next.length !== value.length) {
      onChange(next);
      setAnnounce(`Added ${next[next.length - 1]}`);
    }
  }
  const commit = () => { if (draft.trim()) add([draft]); setDraft(""); };
  const remove = (i: number) => {
    setAnnounce(`Removed ${value[i]}`);
    onChange(value.filter((_, k) => k !== i));
    setNotice("");
    inputRef.current?.focus();
  };

  const open = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="input flex min-h-[3rem] cursor-text flex-wrap items-center gap-1.5 !p-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]"
        onClick={() => inputRef.current?.focus()}>
        {value.map((tag, i) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1 text-sm">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={(e) => { e.stopPropagation(); remove(i); }}
              className="grid size-6 place-items-center rounded-full text-fg-muted hover:bg-line hover:text-fg">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input id={id} ref={inputRef} value={draft} disabled={full}
          aria-invalid={!!error} aria-describedby={`${id}-hint`}
          placeholder={full ? `Limit of ${maxTags} reached` : value.length ? "Add another…" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-fg-subtle"
          onChange={(e) => {
            const v = e.target.value;
            if (!v.includes(",")) return setDraft(v);
            const parts = v.split(",");
            add(parts.slice(0, -1));
            setDraft(parts[parts.length - 1]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Backspace" && !draft && value.length) remove(value.length - 1);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/[,\n]/.test(text)) return;
            e.preventDefault();
            add(text.split(/[,\n]/));
          }}
          onBlur={commit} />
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-subtle">
        Press Enter or comma after each item. <span className={full ? "font-semibold text-warn" : ""}>{value.length}/{maxTags} added.</span>
      </p>
      {notice && <p className="mt-1 text-sm text-warn" role="status">{notice}</p>}
      {full && !notice && <p className="mt-1 text-sm text-warn">You&apos;ve reached the limit of {maxTags} ingredients.</p>}
      {error && <p className="err" role="alert">{error}</p>}

      {open.length > 0 && !full && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Quick add</p>
          <ul className="flex flex-wrap gap-1.5">
            {open.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => add([s])}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-sm text-fg-muted hover:border-accent hover:text-fg">
                  <Plus className="size-3.5" aria-hidden="true" />{s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </div>
  );
}
