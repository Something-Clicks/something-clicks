export function PlaceholderNotice({ version }: { version: string }) {
  return (
    <div className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <strong>Draft placeholder (version {version}).</strong> This text is a placeholder and will be replaced with the
      final terms before launch. It is not legal advice and has not been reviewed by a lawyer.
    </div>
  );
}
