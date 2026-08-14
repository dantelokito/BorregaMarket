export function VerificationRequiredBanner({ id = "google-lock-hint" }: { id?: string }) {
  return (
    <p
      id={id}
      className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"
      role="status"
    >
      Requiere verificación de tu negocio
    </p>
  );
}
