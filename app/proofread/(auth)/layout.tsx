export default function ProofreadAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="aurora">
        <div className="aurora-blob left-1/4 top-0 h-96 w-96 bg-signal" />
        <div className="aurora-blob right-1/4 bottom-0 h-96 w-96 bg-cyan" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
