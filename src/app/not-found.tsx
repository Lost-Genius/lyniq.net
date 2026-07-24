import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="font-display text-6xl font-bold text-cyber-cyan neon-text mb-4">
        404
      </h1>
      <p className="text-cyber-muted mb-8">This node does not exist.</p>
      <Link href="/" className="cyber-button-primary">
        Return to the network
      </Link>
    </div>
  );
}
