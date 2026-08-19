export function normalizePracticeTags(value: string) {
  const seen = new Set<string>();

  return value
    .split(",")
    .map((tag) =>
      tag
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word) =>
          word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "",
        )
        .join(" "),
    )
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function serializePracticeTags(value: string) {
  return normalizePracticeTags(value).join(", ");
}
