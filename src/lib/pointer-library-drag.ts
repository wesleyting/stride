/** Mouse drag adapter: keep wheel input available instead of entering native DnD. */
export function installPointerLibraryDrag(library: HTMLElement): () => void {
  let source: HTMLElement | null = null;
  let origin = { x: 0, y: 0 };
  let point = origin;
  let transfer: DataTransfer | null = null;
  let ghost: HTMLElement | null = null;
  let frame = 0;
  let offset = { x: 0, y: 0 };
  let suppressClickUntil = 0;
  let previousSelection = "";
  let mouseGesture = false;

  function dispatch(target: Element, type: string) {
    return target.dispatchEvent(new DragEvent(type, {
      bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, dataTransfer: transfer,
    }));
  }

  function targetAtPointer() {
    const target = document.elementFromPoint(point.x, point.y);
    return target && library.contains(target) ? target : null;
  }

  function update() {
    if (!ghost) return;
    ghost.style.left = `${point.x - offset.x}px`;
    ghost.style.top = `${point.y - offset.y}px`;
    // Re-hit-test as scrolling moves folders and rows beneath a stationary mouse.
    const target = targetAtPointer();
    dispatch(target ?? document.documentElement, "dragover");
    frame = requestAnimationFrame(update);
  }

  function down(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0 || source) return;
    mouseGesture = true;
    const target = event.target as HTMLElement;
    const draggable = target.closest<HTMLElement>('[draggable="true"]');
    if (!draggable || !library.contains(draggable) || target.closest("[data-song-controls], input, textarea, select, a")) return;
    const button = target.closest("button");
    if (button && button !== draggable) return;
    source = draggable;
    origin = point = { x: event.clientX, y: event.clientY };
  }

  function move(event: PointerEvent) {
    if (!source || event.pointerType !== "mouse") return;
    point = { x: event.clientX, y: event.clientY };
    if (!ghost && Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return;
    event.preventDefault();
    if (!ghost) {
      const rect = source.getBoundingClientRect();
      offset = { x: origin.x - rect.left, y: origin.y - rect.top };
      ghost = source.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("id");
      ghost.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      Object.assign(ghost.style, { position: "fixed", width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", pointerEvents: "none", zIndex: "1000", opacity: "0.95", transform: "rotate(0.4deg)", boxShadow: "0 14px 30px rgba(28,25,23,0.18)" });
      document.body.appendChild(ghost);
      previousSelection = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      transfer = new DataTransfer();
      dispatch(source, "dragstart");
      update();
    }
  }

  function finish(drop: boolean) {
    if (ghost && source) {
      if (drop) {
        const target = targetAtPointer();
        if (target) dispatch(target, "drop");
      }
      dispatch(source, "dragend");
      ghost.remove();
      document.body.style.userSelect = previousSelection;
      suppressClickUntil = performance.now() + 250;
    }
    cancelAnimationFrame(frame);
    source = null;
    ghost = null;
    transfer = null;
    mouseGesture = false;
  }

  function up(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    point = { x: event.clientX, y: event.clientY };
    finish(true);
  }
  function cancel() { finish(false); }
  function key(event: KeyboardEvent) {
    if (event.key === "Escape" && ghost) { event.preventDefault(); cancel(); }
  }
  function nativeStart(event: DragEvent) {
    if (mouseGesture && event.isTrusted) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function click(event: MouseEvent) {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }

  library.addEventListener("pointerdown", down, true);
  library.addEventListener("dragstart", nativeStart, true);
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", cancel);
  document.addEventListener("keydown", key, true);
  document.addEventListener("click", click, true);
  window.addEventListener("blur", cancel);
  return () => {
    cancel();
    library.removeEventListener("pointerdown", down, true);
    library.removeEventListener("dragstart", nativeStart, true);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
    document.removeEventListener("keydown", key, true);
    document.removeEventListener("click", click, true);
    window.removeEventListener("blur", cancel);
  };
}
