# Research: Kleros arbitration for Project B’s $10 agent jobs

## Summary
Primary-source research was blocked: the available tools were only file read, file write, and supervisor contact; no web_search, web fetch/browser, or registered source_check tool was available. The supervisor instructed me to stop rather than substitute recalled claims or change execution modes. No Kleros-specific implementation or economic conclusion has been verified.

## Findings
1. **Claim:** The supplied proposal distinguishes neither the source of the customer’s $10 payment nor its relationship to the $10 worth of locked bTokens. **Sources:** Task description only (not external evidence). **Support:** interpretation. **Confidence:** high that this ambiguity exists in the supplied description. Customer payment escrow and operator collateral must be accounted for separately to assess payouts, refunds, and penalties; locking collateral alone does not establish that a customer payment was collected.
2. **Claim:** This research run cannot establish which Kleros deployment, arbitrator version, court, fee schedule, appeal mechanism, or integration contract would support the proposal. **Sources:** No primary sources accessible. **Support:** research limitation. **Confidence:** high.

## Decision implications — recommendations, not verified Kleros facts
- Do not treat Kleros integration or economical arbitration of $10 jobs as established by this run.
- Before judging viability, specify who pays the customer price, where that payment is held, what bTokens represent and how they redeem, what assets are slashable, and who receives any penalty. Explicitly specify outcomes for agent win, customer win, partial performance, refusal to rule, and abandoned disputes.
- Require direct contract-level verification of how an authenticated final ruling causes escrow payout/refund and collateral penalties. This run did not verify callbacks, appeal finality, execution permissions, or accounting protections.
- Require a task specification with measurable acceptance criteria, a deadline, allowed inputs/tools, deliverable format, evidence requirements, and explicit handling of subjective quality and partially completed work. This is a design recommendation, not a claim about existing Kleros rules.

## Contradictions
None found; no external evidence was inspected, so this is not evidence that relevant sources agree.

## Missing evidence
- Original ERC-792/1497 texts and their applicability to the selected current integration.
- Official deployed arbitrable escrow contracts, verified addresses, supported networks and version constraints.
- Live court parameters: arbitration fees, funding rules, appeal fees/deposits, appeal windows, and who bears unrecovered costs.
- Time to an executable final ruling, including evidence periods, appeals, and enforcement transactions; no turnaround or live-cost estimate is supported.
- Evidence storage/access, publicity, retention, redaction, and treatment of confidential customer or agent data.
- Exact ruling-to-payout/slashing code path and handling of unavailable arbitration, unresolved appeals, or refusal to rule.
- Whether expected dispute costs and collateral requirements are proportionate to $10 jobs.

## Sources
- Kept: None. No primary source was fetched or inspected; consequently there are no verified source dates or citations.
- Rejected/deprioritized: Recalled Kleros details were deliberately excluded rather than presented as evidence.

## Next steps
Restore web search and direct-source fetching, with a registered source_check tool, then inspect official standards, the proposed deployment’s verified arbitrable contract, and current court configuration. These are prerequisites to an evidence-based recommendation.
