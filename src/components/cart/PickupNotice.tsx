export function PickupNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-slate-500 ${className}`}>
      🏪 Pagas al recoger en la frutería
    </p>
  );
}
