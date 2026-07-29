import Link from "next/link";
export default function NotFound() { return <main className="error-page"><span className="status-mark ring" aria-hidden="true" /><h1>This market bundle is unavailable.</h1><p>It may be retired, unverified, or absent from the active catalog. It is not substituted with a placeholder.</p><Link className="button primary" href="/">Open Market Stream</Link></main>; }
