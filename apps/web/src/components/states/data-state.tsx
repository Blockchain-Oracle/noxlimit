import Link from "next/link";

export function DataState({
  eyebrow = "Live data boundary",
  title,
  message,
  actionHref,
  actionLabel,
}: {
  eyebrow?: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="data-state" role="status">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{message}</p>
      {actionHref && actionLabel ? <Link className="button secondary" href={actionHref}>{actionLabel}</Link> : null}
    </section>
  );
}
