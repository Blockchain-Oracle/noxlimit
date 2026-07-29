const steps = [
  ["01", "Direct confidential input", "Your raw maximum stays in browser memory. The browser derives a minimum-share bound and sends that bound to the official Nox Gateway for encryption. The NoxLimit API, database, and analytics receive neither value."],
  ["02", "Checked while you are away", "A hosted evaluator sees zero for an ineligible check and learns the exact derived limit for an eligible check, within a visible check budget."],
  ["03", "Published before execution", "Public decryption ends the resting privacy phase. The candidate is retrievable before finalization, even if the pool trade later fails."],
  ["04", "Executed by the real pool", "A proved nonzero result attempts one minimum-shares-protected FPMM buy. A failed execution does not make a published value private again."],
] as const;

export function PrivacyExplainer() {
  return (
    <article className="privacy-page">
      <header><span className="eyebrow">How privacy works</span><h1>One protected instruction inside a public market.</h1><p>Your wallet, market, side, public amount, timing, evaluation metadata, fills, positions, and redemption remain public.</p></header>
      <div className="privacy-route" aria-label="Confidential input route"><span>Browser</span><i aria-hidden="true" /><span>Nox Gateway</span><i aria-hidden="true" /><span>Evaluator</span><s>NoxLimit API</s></div>
      <ol className="privacy-steps">{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></li>)}</ol>
      <blockquote>Your raw maximum stays in browser memory. Its derived minimum-share bound goes directly to the Nox Gateway and stays encrypted while resting—not invisible. Our application backend receives neither value. The evaluator learns the bound on an eligible check, and public decryption exposes it before the pool trade is finalized.</blockquote>
    </article>
  );
}
