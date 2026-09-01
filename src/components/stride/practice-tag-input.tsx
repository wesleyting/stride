"use client";

import { useId, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { normalizePracticeTags, serializePracticeTags } from "@/lib/practice-tags";

export function PracticeTagInput({
  name,
  suggestions,
  optional = false,
  initialValue = "",
}: {
  name: string;
  suggestions: string[];
  optional?: boolean;
  initialValue?: string;
}) {
  const inputId = useId();
  const [tags, setTags] = useState<string[]>(() => normalizePracticeTags(initialValue));
  const [draft, setDraft] = useState("");
  const normalizedSuggestions = normalizePracticeTags(suggestions.join(","));

  function addTags(values: string[]) {
    setTags(normalizePracticeTags([...tags, ...values].join(",")));
  }

  function commitDraft() {
    if (!draft.trim()) return;
    addTags([draft]);
    setDraft("");
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 text-sm font-semibold text-stone-900"
      >
        <Tag className="size-4 text-stone-500" aria-hidden="true" />
        What did you work on?
        {optional ? <span className="font-normal text-stone-500">Optional</span> : null}
      </label>
      <div
        className="mt-1.5 flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-2 shadow-sm transition hover:border-stone-400 focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-500/20"
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700"
          >
            {tag}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove ${tag}`}
              className="-mr-1 rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) {
              const parts = value.split(",");
              addTags(parts.slice(0, -1));
              setDraft(parts.at(-1) ?? "");
            } else {
              setDraft(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            } else if (event.key === "Backspace" && !draft && tags.length > 0) {
              setTags(tags.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
          maxLength={80}
          placeholder={tags.length === 0 ? "Intro, Chorus, Singing…" : "Add another…"}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:ring-0"
        />
      </div>
      <input
        type="hidden"
        name={name}
        value={serializePracticeTags([...tags, draft].join(","))}
      />
      {normalizedSuggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Previous tags">
          {normalizedSuggestions.map((tag) => {
            const selected = tags.some(
              (selectedTag) =>
                selectedTag.toLocaleLowerCase() === tag.toLocaleLowerCase(),
            );
            return (
              <button
                key={tag}
                type="button"
                disabled={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTags([tag])}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-400"
              >
                <Plus className="size-3" aria-hidden="true" />
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
