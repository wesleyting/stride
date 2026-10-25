import { expect, test } from "@playwright/test";
import { songPositions } from "../../src/lib/song-arrangement";
import type { ItemRecord, SongFolderRecord } from "../../src/lib/stride";

const folder = (id: string, order: number) => ({ id, name: id, sort_order: order } as SongFolderRecord);
const song = (id: string, folderId: string | null, order: number, hidden = false) => ({ id, name: id, folder_id: folderId, sort_order: order, is_hidden: hidden } as ItemRecord);

test("draft positions cross folders in library order, including empty folders", () => {
  const selected = song("selected", "a", 0);
  const songs = [selected, ...Array.from({ length: 12 }, (_, index) => song(`song-${index}`, "a", index + 1)), song("last", "c", 0)];
  const before = JSON.stringify(songs);
  const slots = songPositions(selected, songs, [folder("c", 2), folder("a", 0), folder("empty", 1)]);
  expect(slots[0].original).toBe(true);
  expect(slots[10].above).toBe("song-9");
  expect(slots[10].below).toBe("song-10");
  expect(slots[13].folderId).toBe("empty");
  expect(slots[13].orderedIds).toEqual(["selected"]);
  expect(slots[14].folderId).toBe("c");
  expect(slots[14].orderedIds).toEqual(["selected", "last"]);
  expect(slots.at(-1)?.folderId).toBeNull();
  expect(JSON.stringify(songs)).toBe(before);
});

test("returning to the original slot is a no-op and original order uses the library tie-break", () => {
  const selected = song("B", "a", 0);
  const slots = songPositions(selected, [selected, song("A", "a", 0), song("C", "a", 0)], [folder("a", 0)]);
  expect(slots.filter((slot) => slot.original)).toHaveLength(1);
  expect(slots[1].original).toBe(true);
  expect(slots[1].orderedIds).toEqual(["A", "B", "C"]);
});

test("hidden and active songs remain partitioned when moving folders", () => {
  const active = song("active", "a", 0);
  const hidden = song("hidden", "a", 1, true);
  const songs = [active, hidden, song("other-active", "b", 1), song("other-hidden", "b", 0, true)];
  const folders = [folder("a", 0), folder("b", 1)];
  const activeSlots = songPositions(active, songs, folders).filter((slot) => slot.folderId === "b");
  expect(activeSlots[1].orderedIds).toEqual(["other-active", "active", "other-hidden"]);
  const hiddenSlots = songPositions(hidden, songs, folders).filter((slot) => slot.folderId === "b");
  expect(hiddenSlots[0].orderedIds).toEqual(["other-active", "hidden", "other-hidden"]);
  expect(hiddenSlots[1].orderedIds).toEqual(["other-active", "other-hidden", "hidden"]);
});
