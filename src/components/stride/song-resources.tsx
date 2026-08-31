"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { SongResourceRecord } from "@/lib/stride";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function SongResources({
  itemId,
  userId,
  initialResources,
}: {
  itemId: string;
  userId: string;
  initialResources: SongResourceRecord[];
}) {
  const [resources, setResources] = useState(initialResources);
  const [selected, setSelected] = useState<SongResourceRecord | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Images must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    setError("");
    const supabase = createClient();
    const resourceId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${itemId}/${resourceId}-${safeName}`;
    const previewUrl = URL.createObjectURL(file);
    const optimistic: SongResourceRecord = {
      id: resourceId,
      item_id: itemId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      created_at: new Date().toISOString(),
      signed_url: previewUrl,
    };
    setResources((current) => [optimistic, ...current]);

    const uploadResult = await supabase.storage.from("song-resources").upload(path, file, { upsert: false });
    if (uploadResult.error) {
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
      URL.revokeObjectURL(previewUrl);
      setError(uploadResult.error.message.includes("Bucket not found") ? "Run migration 0006_guitar_workspace.sql to enable image uploads." : uploadResult.error.message);
      setBusy(false);
      return;
    }

    const metadataResult = await supabase.from("song_resources").insert({
      id: resourceId,
      user_id: userId,
      item_id: itemId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
    });
    if (metadataResult.error) {
      await supabase.storage.from("song-resources").remove([path]);
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
      URL.revokeObjectURL(previewUrl);
      setError(metadataResult.error.message);
      setBusy(false);
      return;
    }

    const signed = await supabase.storage.from("song-resources").createSignedUrl(path, 3600);
    if (signed.data?.signedUrl) {
      setResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, signed_url: signed.data.signedUrl } : resource));
    }
    URL.revokeObjectURL(previewUrl);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(resource: SongResourceRecord) {
    setError("");
    const before = resources;
    setResources((current) => current.filter((candidate) => candidate.id !== resource.id));
    setSelected(null);
    setConfirmingDelete(false);
    const supabase = createClient();
    const storageResult = await supabase.storage.from("song-resources").remove([resource.storage_path]);
    const metadataResult = await supabase.from("song_resources").delete().eq("id", resource.id).eq("item_id", itemId);
    if (storageResult.error || metadataResult.error) {
      setResources(before);
      setSelected(resource);
      setError(storageResult.error?.message ?? metadataResult.error?.message ?? "Could not remove the image.");
    }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white" aria-labelledby="resources-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
        <h2 id="resources-heading" className="text-sm font-semibold text-stone-950">Screenshots</h2>
        <label className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Upload data-icon="inline-start" aria-hidden="true" />
          {busy ? "Uploading…" : "Add image"}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {error ? <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-5">{error}</p> : null}
      {resources.length ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          {resources.map((resource) => (
            <button key={resource.id} type="button" onClick={() => setSelected(resource)} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100 text-left transition hover:border-stone-400 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-stone-500">
              {resource.signed_url ? <Image src={resource.signed_url} alt={resource.file_name} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" /> : null}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-xs font-medium text-white">{resource.file_name}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="m-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-5 text-left transition hover:border-stone-400 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500 sm:m-5 sm:w-[calc(100%-2.5rem)]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100"><ImagePlus className="size-5 text-stone-600" aria-hidden="true" /></span>
          <span className="text-sm font-semibold text-stone-900">Add screenshot</span>
        </button>
      )}

      <DialogShell open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setConfirmingDelete(false); } }} title={confirmingDelete ? "Remove screenshot?" : selected?.file_name ?? "Screenshot"} size={confirmingDelete ? "md" : "xl"}>
        {selected ? confirmingDelete ? <div className="grid gap-5"><p className="text-sm leading-6 text-stone-600">This permanently removes <span className="font-medium text-stone-900">{selected.file_name}</span>.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmingDelete(false)} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="button" onClick={() => remove(selected)} className={buttonVariants({ variant: "destructive" })}><Trash2 data-icon="inline-start" aria-hidden="true" />Remove</button></div></div> : <div className="grid gap-4"><div className="relative min-h-[50vh] overflow-hidden rounded-lg bg-stone-100">{selected.signed_url ? <Image src={selected.signed_url} alt={selected.file_name} fill unoptimized className="object-contain" /> : null}</div><div className="flex justify-end"><button type="button" onClick={() => setConfirmingDelete(true)} className={buttonVariants({ variant: "destructive" })}><Trash2 data-icon="inline-start" aria-hidden="true" />Remove</button></div></div> : null}
      </DialogShell>
    </section>
  );
}
