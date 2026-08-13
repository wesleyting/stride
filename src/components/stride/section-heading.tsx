export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      ) : null}
    </div>
  );
}
