"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Expand, Eye, FileAudio, FileImage, FileVideo, Lock, Trash2, Upload } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { SongResourceRecord } from "@/lib/stride";
import { authHref } from "@/lib/return-path";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm"]);
const accept = Array.from(acceptedTypes).join(",");
type PendingMedia = { file: File; previewUrl: string; isPublic: boolean };

export function SongResources({ itemId, itemSlug, userId, initialResources, isGuest = false }: { itemId: string; itemSlug: string; userId: string; initialResources: SongResourceRecord[]; isGuest?: boolean }) {
  const [resources, setResources] = useState(initialResources);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [selected, setSelected] = useState<SongResourceRecord | null>(null);
  const [sharingCandidate, setSharingCandidate] = useState<SongResourceRecord | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guestGateOpen, setGuestGateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedPreviewRef = useRef<HTMLDivElement>(null);
  const selectedIndex = selected ? resources.findIndex((resource) => resource.id === selected.id) : -1;

  useEffect(() => {
    if (!selected || confirmingDelete || resources.length < 2) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setSelected(resources[(selectedIndex - 1 + resources.length) % resources.length]);
      if (event.key === "ArrowRight") setSelected(resources[(selectedIndex + 1) % resources.length]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingDelete, resources, selected, selectedIndex]);

  function chooseFile(file?: File) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!acceptedTypes.has(file.type)) { setError("Use a JPG, PNG, WebP, GIF, MP4, MOV, WebM, MP3, M4A, or WAV file."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("Practice media must be 50 MB or smaller."); return; }
    setError("");
    setPendingMedia({ file, previewUrl: URL.createObjectURL(file), isPublic: true });
  }

  function closePreview() {
    if (busy) return;
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
    setError("");
  }

  async function upload() {
    if (!pendingMedia) return;
    const { file, previewUrl, isPublic } = pendingMedia;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const resourceId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${itemId}/${resourceId}-${safeName}`;
    const optimistic: SongResourceRecord = { id: resourceId, item_id: itemId, storage_path: path, file_name: file.name, mime_type: file.type, is_public: isPublic, created_at: new Date().toISOString(), signed_url: previewUrl };
    setResources((current) => [optimistic, ...current]);

    const uploadResult = await supabase.storage.from("song-resources").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadResult.error) {
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
      setError(uploadResult.error.message.includes("maximum allowed size") ? "Run migration 0009 and confirm the project upload limit allows 50 MB files." : uploadResult.error.message.includes("mime type") ? "Run migration 0009 to enable audio and video formats." : uploadResult.error.message);
      setBusy(false);
      return;
    }

    const metadataResult = await supabase.from("song_resources").insert({ id: resourceId, user_id: userId, item_id: itemId, storage_path: path, file_name: file.name, mime_type: file.type, is_public: isPublic });
    if (metadataResult.error) {
      await supabase.storage.from("song-resources").remove([path]);
      setResources((current) => current.filter((resource) => resource.id !== resourceId));
      setError(metadataResult.error.code === "PGRST204" || metadataResult.error.code === "42703" ? "Run migration 0009_practice_media_visibility.sql before uploading practice media." : metadataResult.error.message);
      setBusy(false);
      return;
    }

    const signed = await supabase.storage.from("song-resources").createSignedUrl(path, 3600);
    if (signed.data?.signedUrl) {
      setResources((current) => current.map((resource) => resource.id === resourceId ? { ...resource, signed_url: signed.data.signedUrl } : resource));
      URL.revokeObjectURL(previewUrl);
    }
    setPendingMedia(null);
    setBusy(false);
  }

  async function toggleVisibility(resource: SongResourceRecord) {
    const next = !resource.is_public;
    setError("");
    setResources((current) => current.map((candidate) => candidate.id === resource.id ? { ...candidate, is_public: next } : candidate));
    setSelected((current) => current?.id === resource.id ? { ...current, is_public: next } : current);
    const result = await createClient().from("song_resources").update({ is_public: next }).eq("id", resource.id).eq("item_id", itemId);
    if (result.error) {
      setResources((current) => current.map((candidate) => candidate.id === resource.id ? { ...candidate, is_public: resource.is_public } : candidate));
      setSelected((current) => current?.id === resource.id ? { ...current, is_public: resource.is_public } : current);
      setError(result.error.code === "PGRST204" || result.error.code === "42703" ? "Run migration 0009_practice_media_visibility.sql to control media sharing." : result.error.message);
    }
  }

  function changeVisibility(resource: SongResourceRecord) {
    if (isGuest && !resource.is_public) {
      setGuestGateOpen(true);
      return;
    }
    if (resource.is_public) void toggleVisibility(resource);
    else {
      setSelected(null);
      setSharingCandidate(resource);
    }
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
    if (storageResult.error || metadataResult.error) { setResources(before); setSelected(resource); setError(storageResult.error?.message ?? metadataResult.error?.message ?? "Could not remove the file."); }
  }

  return <section className="rounded-xl border border-stone-200 bg-white" aria-labelledby="resources-heading">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5"><div><h2 id="resources-heading" className="text-sm font-semibold text-stone-950">Practice Media</h2><p className="mt-0.5 text-xs text-stone-500">Preview each file and choose who can see it.</p></div>{isGuest ? <button type="button" onClick={() => setGuestGateOpen(true)} className={buttonVariants({ variant: "outline", size: "sm" })}><Upload data-icon="inline-start" aria-hidden="true" />Add Media</button> : <label className={buttonVariants({ variant: "outline", size: "sm" })}><Upload data-icon="inline-start" aria-hidden="true" />Add Media<input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>}</div>
    {error && !pendingMedia ? <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-5">{error}</p> : null}
    {resources.length ? <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} open={() => setSelected(resource)} toggleVisibility={() => changeVisibility(resource)} />)}</div> : <button type="button" onClick={() => isGuest ? setGuestGateOpen(true) : inputRef.current?.click()} className="m-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-5 text-left transition hover:border-stone-400 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500 sm:m-5 sm:w-[calc(100%-2.5rem)]"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100"><Upload className="size-5 text-stone-600" aria-hidden="true" /></span><span><span className="block text-sm font-semibold text-stone-900">Add Your First Recording</span><span className="mt-0.5 block text-xs text-stone-500">Video, audio, or a screenshot</span></span></button>}

    <DialogShell open={guestGateOpen} onOpenChange={setGuestGateOpen} title="Save Your Progress to Add Media" description="Guest practice stays fully usable, but an account is required for file storage and sharing." size="md">
      <div className="grid gap-5"><div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><p className="text-sm font-semibold text-stone-900">Your songs and logs will stay in place</p><p className="mt-1 text-sm leading-6 text-stone-500">After confirming your email, you can upload recordings, screenshots, and audio from this song.</p></div><div className="flex justify-end"><Link href={authHref("/sign-up", `/songs/${itemSlug}`)} className={buttonVariants()}>Save Your Progress</Link></div></div>
    </DialogShell>

    <DialogShell open={Boolean(pendingMedia)} onOpenChange={(open) => { if (!open) closePreview(); }} title="Preview Practice Media" description="Make sure this is the right file, then choose who can see it." size="lg">
      {pendingMedia ? <div className="grid gap-5"><ResourcePreview resource={{ id: "preview", item_id: itemId, storage_path: "", file_name: pendingMedia.file.name, mime_type: pendingMedia.file.type, created_at: "", signed_url: pendingMedia.previewUrl }} /><fieldset><legend className="text-sm font-semibold text-stone-900">Who can see this?</legend><div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Media visibility"><button type="button" role="radio" aria-checked={pendingMedia.isPublic} onClick={() => setPendingMedia({ ...pendingMedia, isPublic: true })} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-stone-500 ${pendingMedia.isPublic ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" : "border-stone-200 hover:border-stone-300"}`}><Eye className="mt-0.5 size-4" aria-hidden="true" /><span><span className="block text-sm font-semibold">Public</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">Shown on your profile when Song Resources is enabled.</span></span></button><button type="button" role="radio" aria-checked={!pendingMedia.isPublic} onClick={() => setPendingMedia({ ...pendingMedia, isPublic: false })} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-stone-500 ${!pendingMedia.isPublic ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" : "border-stone-200 hover:border-stone-300"}`}><Lock className="mt-0.5 size-4" aria-hidden="true" /><span><span className="block text-sm font-semibold">Only Me</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">Kept privately on this song.</span></span></button></div></fieldset>{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}<div className="flex justify-end gap-2 border-t border-stone-200 pt-4"><button type="button" onClick={closePreview} disabled={busy} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="button" onClick={upload} disabled={busy} className={buttonVariants()}>{busy ? "Uploading…" : pendingMedia.isPublic ? "Upload Publicly" : "Upload Privately"}</button></div></div> : null}
    </DialogShell>

    <DialogShell open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setConfirmingDelete(false); } }} title={confirmingDelete ? "Remove Practice Media?" : selected?.file_name ?? "Practice Media"} size={confirmingDelete ? "md" : "xl"}>
      {selected ? confirmingDelete ? <div className="grid gap-5"><p className="text-sm leading-6 text-stone-600">This permanently removes <span className="font-medium text-stone-900">{selected.file_name}</span>.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmingDelete(false)} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="button" onClick={() => remove(selected)} className={buttonVariants({ variant: "destructive" })}><Trash2 data-icon="inline-start" aria-hidden="true" />Remove</button></div></div> : <div className="grid gap-4"><div ref={selectedPreviewRef} className="relative overflow-hidden rounded-lg bg-stone-950"><ResourcePreview resource={selected} />{resources.length > 1 ? <><button type="button" onClick={() => setSelected(resources[(selectedIndex - 1 + resources.length) % resources.length])} aria-label="Previous media" className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="size-5" aria-hidden="true" /></button><button type="button" onClick={() => setSelected(resources[(selectedIndex + 1) % resources.length])} aria-label="Next media" className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="size-5" aria-hidden="true" /></button></> : null}</div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs tabular-nums text-stone-500">{selectedIndex + 1} of {resources.length}{resources.length > 1 ? " · Use Left and Right arrow keys" : ""}</p><div className="flex gap-2">{selected.signed_url ? <a href={selected.signed_url} download={selected.file_name} className={buttonVariants({ variant: "outline", size: "sm" })}><Download data-icon="inline-start" aria-hidden="true" />Download</a> : null}<button type="button" onClick={() => void selectedPreviewRef.current?.requestFullscreen()} className={buttonVariants({ variant: "outline", size: "sm" })}><Expand data-icon="inline-start" aria-hidden="true" />Full Screen</button></div></div><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => changeVisibility(selected)} className={buttonVariants({ variant: selected.is_public ? "outline" : "default" })}>{selected.is_public ? <Lock data-icon="inline-start" aria-hidden="true" /> : <Eye data-icon="inline-start" aria-hidden="true" />}{selected.is_public ? "Make Only Me" : "Make Public"}</button><button type="button" onClick={() => setConfirmingDelete(true)} className={buttonVariants({ variant: "destructive" })}><Trash2 data-icon="inline-start" aria-hidden="true" />Remove</button></div><p className="text-xs leading-5 text-stone-500">{selected.is_public ? "Public on your profile when Song Resources is enabled." : "Only you can see this file."}</p></div> : null}
    </DialogShell>

    <DialogShell open={Boolean(sharingCandidate)} onOpenChange={(open) => { if (!open) setSharingCandidate(null); }} title="Make This Media Public?" description="This file will become visible to other signed-in users on your public profile when Song Resources is enabled." size="md">
      {sharingCandidate ? <div className="grid gap-5"><div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><Eye className="size-4 shrink-0 text-stone-500" aria-hidden="true" /><span className="min-w-0 truncate text-sm font-medium text-stone-800">{sharingCandidate.file_name}</span></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setSharingCandidate(null)} className={buttonVariants({ variant: "outline" })}>Keep Private</button><button type="button" onClick={() => { const resource = sharingCandidate; setSharingCandidate(null); void toggleVisibility(resource); }} className={buttonVariants()}>Make Public</button></div></div> : null}
    </DialogShell>
  </section>;
}

function ResourceCard({ resource, open, toggleVisibility }: { resource: SongResourceRecord; open: () => void; toggleVisibility: () => void }) {
  const Icon = resource.mime_type.startsWith("video/") ? FileVideo : resource.mime_type.startsWith("audio/") ? FileAudio : FileImage;
  return <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100 transition hover:border-stone-400 hover:shadow-sm focus-within:ring-2 focus-within:ring-stone-500"><button type="button" onClick={open} className="relative h-full w-full text-left focus:outline-none">{resource.mime_type.startsWith("image/") && resource.signed_url ? <Image src={resource.signed_url} alt={resource.file_name} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" /> : <span className="flex h-full flex-col items-center justify-center gap-2 px-3"><Icon className="size-8 text-stone-500" aria-hidden="true" /><span className="max-w-full truncate text-xs font-medium text-stone-700">{resource.file_name}</span></span>}{resource.mime_type.startsWith("image/") ? <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-xs font-medium text-white">{resource.file_name}</span> : null}</button><button type="button" onClick={toggleVisibility} title={resource.is_public ? "Public — click to make only me" : "Only me — click to make public"} aria-label={resource.is_public ? `Make ${resource.file_name} only visible to me` : `Make ${resource.file_name} public`} className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-white hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-900">{resource.is_public ? <Eye className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}</button></div>;
}

function ResourcePreview({ resource }: { resource: SongResourceRecord }) {
  if (!resource.signed_url) return <div className="fullscreen-media flex min-h-64 items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500">Preview unavailable</div>;
  if (resource.mime_type.startsWith("video/")) return <video src={resource.signed_url} controls preload="metadata" className="fullscreen-media max-h-[60vh] w-full rounded-lg bg-black object-contain" />;
  if (resource.mime_type.startsWith("audio/")) return <div className="fullscreen-media flex min-h-44 items-center justify-center rounded-lg bg-stone-100 px-6"><audio src={resource.signed_url} controls preload="metadata" className="w-full" /></div>;
  return <div className="fullscreen-media relative min-h-[45vh] overflow-hidden rounded-lg bg-stone-100"><Image src={resource.signed_url} alt={resource.file_name} fill unoptimized className="object-contain" /></div>;
}
