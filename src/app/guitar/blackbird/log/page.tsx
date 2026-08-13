"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/stride/app-frame";
import { PageHeader } from "@/components/stride/page-header";
import { usePractice } from "@/components/stride/practice-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const feelingLabels = [
  "Very difficult",
  "Difficult",
  "Neutral",
  "Good",
  "Very good",
];

export default function LogPracticePage() {
  const router = useRouter();
  const { logPractice } = usePractice();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(4);
  const [error, setError] = useState("");

  const canSave = note.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      setError("Add a short note about your practice before saving.");
      return;
    }

    logPractice(note, rating);
    router.push("/guitar/blackbird");
  }

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref="/guitar/blackbird"
          backLabel="Back to Blackbird"
          title="Log practice — Blackbird"
        />

        <form className="mt-8" onSubmit={handleSubmit} noValidate>
          <div className="max-w-3xl">
            <Label htmlFor="practice-note" className="text-sm font-semibold">
              How did it go? <span className="font-normal text-stone-500">(required)</span>
            </Label>
            <p id="practice-note-help" className="mt-1 text-sm text-stone-500">
              Write it the way you’d want to remember it later.
            </p>
            <div className="relative mt-3">
              <Textarea
                id="practice-note"
                name="practice-note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (error) setError("");
                }}
                maxLength={500}
                rows={6}
                required
                aria-describedby={`practice-note-help practice-note-count${error ? " practice-note-error" : ""}`}
                aria-invalid={Boolean(error)}
                placeholder="Tell me what you worked on, what went well, what’s still hard, anything else…"
                className="min-h-40 resize-y px-3 py-3 pr-16 leading-6"
              />
              <span
                id="practice-note-count"
                className="absolute right-3 bottom-3 text-xs text-stone-500"
              >
                {note.length} / 500
              </span>
            </div>
            {error ? (
              <p id="practice-note-error" className="mt-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <fieldset className="mt-7 max-w-3xl">
            <legend className="text-sm font-semibold text-stone-950">
              How are you feeling about it?
            </legend>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
              {feelingLabels.map((label, index) => {
                const value = index + 1;
                return (
                  <label key={label} className="min-w-0 cursor-pointer text-center">
                    <input
                      type="radio"
                      name="practice-feeling"
                      value={value}
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-base font-medium text-stone-800 transition-colors peer-checked:border-stone-800 peer-checked:bg-stone-800 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-stone-500 peer-focus-visible:ring-offset-2">
                      {value}
                    </span>
                    <span className="mt-2 block text-[0.65rem] leading-4 text-stone-500 sm:text-xs">
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Separator className="my-8" />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/guitar/blackbird"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "sm:min-w-24",
              )}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              size="lg"
              className="sm:min-w-24"
            >
              Save
            </Button>
          </div>
        </form>
      </main>
    </AppFrame>
  );
}
