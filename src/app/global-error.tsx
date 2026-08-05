"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "sans-serif", padding: 24 }}>
        <h2>Algo salió mal.</h2>
        <p>{error.message}</p>
        <button onClick={() => reset()}>Intentar de nuevo</button>
      </body>
    </html>
  );
}
