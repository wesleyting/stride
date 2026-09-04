"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => {
      onOpenChange(false);
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onOpenChange]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      className="dialog-shell fixed inset-0 z-50 m-0 h-full w-full max-w-none border-0 bg-transparent p-0 text-stone-950 backdrop:bg-stone-950/35"
    >
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        onPointerDown={(event) => {
          backdropPointerDown.current = event.target === event.currentTarget;
        }}
        onPointerUp={(event) => {
          if (backdropPointerDown.current && event.target === event.currentTarget) {
            onOpenChange(false);
          }
          backdropPointerDown.current = false;
        }}
      >
        <section
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "dialog-panel flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200 sm:max-h-[calc(100vh-3rem)]",
            size === "md" && "max-w-xl",
            size === "lg" && "max-w-3xl",
            size === "xl" && "max-w-5xl",
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-stone-950"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 max-w-2xl text-sm leading-6 text-stone-600"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close dialog"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
              })}
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
        </section>
      </div>
    </dialog>
  );
}
