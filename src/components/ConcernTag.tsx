export function ConcernTag({ label }: { label: string }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
      {label}
    </span>
  );
}
