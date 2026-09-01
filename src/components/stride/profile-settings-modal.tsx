"use client";

import { useState } from "react";
import { Pencil, UserRoundPlus } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { ProfileSettingsForm, type ProfileSettings } from "@/components/stride/profile-settings-form";
import { buttonVariants } from "@/components/ui/button";

export function ProfileSettingsModal({
  profile,
}: {
  profile: ProfileSettings | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: profile ? "outline" : "default" })}>
        {profile ? <Pencil data-icon="inline-start" aria-hidden="true" /> : <UserRoundPlus data-icon="inline-start" aria-hidden="true" />}
        {profile ? "Edit Profile" : "Create Profile"}
      </button>
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={profile ? "Edit Public Profile" : "Create Public Profile"}
        description="Choose what appears on your public Stride profile."
        size="md"
      >
        {open ? <ProfileSettingsForm profile={profile} onSaved={() => setOpen(false)} showCancel /> : null}
      </DialogShell>
    </>
  );
}
