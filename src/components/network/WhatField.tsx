"use client";

import { useId, useMemo, useRef, useState } from "react";
import { closestVocabulary, normalize, staticVocabulary, suggestVocabulary, type VocabEntry } from "@/content/journeys";

type Option =
  | { kind: "category"; entry: VocabEntry; via?: string }
  | { kind: "add"; href: string };

/**
 * "What you do" as a type-ahead (ARIA 1.2 combobox). Suggests categories from
 * their labels and synonyms, including ones added in admin. When nothing
 * matches, it says so, offers close spellings and "Add your business", and
 * still lets the search go ahead with what was typed. Without JavaScript it's
 * a plain text input.
 */
export function WhatField({ id, defaultValue = "", className = "" }: { id: string; defaultValue?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [vocab, setVocab] = useState<VocabEntry[]>(staticVocabulary);
  const loaded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = normalize(value);
  const suggestions = useMemo(() => (q ? suggestVocabulary(value, vocab, 6) : []), [q, value, vocab]);
  const noMatch = q.length >= 3 && suggestions.length === 0;
  const closest = useMemo(() => (noMatch ? closestVocabulary(value, vocab, 3) : []), [noMatch, value, vocab]);
  const addHref = `/claim/new?${new URLSearchParams({ what: value.trim() })}`;
  const options: Option[] = noMatch
    ? [...closest.map((entry) => ({ kind: "category" as const, entry })), { kind: "add" as const, href: addHref }]
    : suggestions.map((s) => ({ kind: "category" as const, entry: s.entry, via: s.via }));
  const showPopup = open && (suggestions.length > 0 || noMatch);

  // Admin-added synonyms and categories: fetched once, on first focus.
  const loadVocabulary = () => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/vocabulary")
      .then((r) => (r.ok ? r.json() : null))
      .then((v: VocabEntry[] | null) => v && v.length && setVocab(v))
      .catch(() => {});
  };

  const choose = (o: Option) => {
    if (o.kind === "add") {
      window.location.href = o.href;
      return;
    }
    setValue(o.entry.label);
    setOpen(false);
    // Same as picking from the old list: the category's own label goes in the box, then on to "Where".
    inputRef.current?.form?.querySelector<HTMLInputElement>("input[name=where]")?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter" && showPopup && active >= 0 && options[active]) {
      e.preventDefault(); // choose the highlighted option instead of submitting
      choose(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const optionId = (i: number) => `${listId}-o${i}`;
  const status = !showPopup
    ? ""
    : noMatch
      ? `No category matches ${value.trim()}. ${closest.length ? `${closest.length} close match${closest.length === 1 ? "" : "es"}.` : ""}`
      : `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}. Use the arrow keys to choose.`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name="what"
        required
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => {
          loadVocabulary();
          if (value) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPopup}
        aria-controls={listId}
        aria-activedescendant={showPopup && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={80}
        placeholder="Wedding photographer"
        className={className}
      />
      <span className="sr-only" role="status" aria-live="polite">{status}</span>
      <div
        hidden={!showPopup}
        className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden sm:right-auto sm:w-[26rem] rounded-3xl bg-white py-2 text-left shadow-[0_12px_40px_rgba(1,19,53,0.16)] ring-1 ring-line"
      >
        {noMatch && (
          <p className="px-5 pb-2 pt-2 text-sm text-navy-soft">
            We don&rsquo;t match &ldquo;<span className="font-semibold text-navy">{value.trim()}</span>&rdquo; yet. You can still search.
            {closest.length > 0 && <span className="mt-2 block font-semibold text-navy">Did you mean…</span>}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label="What you do">
          {options.map((o, i) => (
            <li
              key={o.kind === "add" ? "add" : o.entry.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-12 cursor-pointer items-center gap-2 px-5 py-2.5 aria-selected:bg-cloud ${o.kind === "add" ? "mt-1 border-t border-line font-semibold text-navy" : ""}`}
            >
              {o.kind === "add" ? (
                <>Add your business →</>
              ) : (
                <span>
                  <span className="font-medium text-navy">{o.entry.label}</span>
                  {o.via && <span className="text-sm text-navy-soft"> · {o.via}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
