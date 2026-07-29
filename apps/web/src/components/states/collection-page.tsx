import Link from "next/link";

export function CollectionPage({ eyebrow, title, empty, walletScoped = true }: { eyebrow: string; title: string; empty: string; walletScoped?: boolean }) {
  return (
    <section className="collection-page"><header><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{walletScoped ? "Connect a wallet to load address-bound chain and indexed evidence." : "Only real indexed events appear here."}</p></header><div className="empty-artifact"><span className="status-mark dashed" aria-hidden="true" /><h2>{empty}</h2><p>No sample records are inserted for visual density.</p><Link className="button secondary" href="/">Return to Market Stream</Link></div></section>
  );
}
