import type { ItemRecord, SongFolderRecord } from "./stride";

export type SongPosition = {
  folderId: string | null;
  folderName: string;
  beforeId?: string;
  above?: string;
  below?: string;
  index: number;
  total: number;
  orderedIds: string[];
  original: boolean;
};

// Every insertion point, in library order. Hidden songs stay in their own
// partition; moving a song never changes its visibility.
export function songPositions(song: ItemRecord, songs: ItemRecord[], folders: SongFolderRecord[]): SongPosition[] {
  const groups = [
    ...[...folders].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map((folder) => ({ id: folder.id as string | null, name: folder.name })),
    { id: null, name: "Uncategorized" },
  ];
  return groups.flatMap((folder) => {
    const all = songs.filter((item) => (item.folder_id ?? null) === folder.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    const originalIndex = all.filter((item) => item.is_hidden === song.is_hidden).findIndex((item) => item.id === song.id);
    const peers = all.filter((item) => item.id !== song.id && item.is_hidden === song.is_hidden);
    const others = all.filter((item) => item.id !== song.id && item.is_hidden !== song.is_hidden);
    return Array.from({ length: peers.length + 1 }, (_, index) => {
      const partition = peers.map((item) => item.id);
      partition.splice(index, 0, song.id);
      return {
        folderId: folder.id, folderName: folder.name, beforeId: peers[index]?.id,
        above: peers[index - 1]?.name, below: peers[index]?.name,
        index, total: peers.length + 1,
        orderedIds: song.is_hidden ? [...others.map((item) => item.id), ...partition] : [...partition, ...others.map((item) => item.id)],
        original: (song.folder_id ?? null) === folder.id && originalIndex === index,
      };
    });
  });
}
