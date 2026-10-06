# Research: Project B economics and tradeoffs

## Summary
**Preliminary recommendation, not a source-verified market conclusion:** test a plain USDC job escrow plus operator-specific performance bond before introducing transferable bTokens. The proposal could address counterparty risk, but its demand, dispute affordability, and token advantage remain unverified; a collateral deposit alone cannot pay an operator for work.

**Research limitation:** no web search, fetch, or source-check tools were available. The supervisor instructed this worker to stop external research and disclose the blocker. No external source was inspected, no adoption claims are verified, and the analysis below is elementary accounting or explicitly labeled inference—not completed source-based research.

## Findings

1. **Claim: Customer payment and operator collateral must be separate liabilities.** **Support:** accounting inference from the supplied hypothetical. **Confidence:** high, conditional on the design below.
   - Customer deposits **$10 payment**; operator separately posts **$10 bond**. Contract holds **$20 USDC**. Locking bTokens is not an additional customer payment.
   - **Successful work/operator wins:** $10 payment goes to operator; $10 bond is released to operator. Operator receives $20 gross but only $10 is job revenue; the other $10 is returned capital. Customer receives the work, no cash refund.
   - **Customer wins, full bond awarded to customer:** $10 payment refunded plus $10 bond compensation; customer receives $20 gross, a $10 net cash gain. Operator loses $10 bond plus its work cost. This is one possible payout rule, not an established Project B rule.
   - **Customer wins, refund only:** customer receives its $10 back; the $10 bond must explicitly be returned, retained, or paid to a specified party. A penalty does not automatically imply customer compensation.
   - These outcomes exclude fees. If fees come from the $20, somebody's payout falls. If parties fund fees separately, total contributions exceed $20. If the customer never deposits a separate payment, transferring the operator's own collateral to the operator produces no job revenue.

2. **Claim: Plain USDC collateral is the simplest baseline; transferability and pooling change the risk model.** **Support:** design inference. **Confidence:** high on accounting distinctions; medium on product recommendation.
   - **Operator-specific bond:** only the responsible operator's reserved collateral bears its job losses. A $10 bond can secure at most one simultaneously outstanding job requiring $10 security unless the system intentionally accepts undercollateralization.
   - **Nontransferable bToken receipt:** potentially useful bookkeeping, but adds no economic security beyond its underlying collateral and enforceable lock/slash rules.
   - **Transferable bToken:** must specify whose redemption claim bears a slash after a transfer. Selling a claim against one's slashable stake can shift losses to buyers and weaken the operator's incentive. Fixed $1 face value is not guaranteed market value or redeemability. Prevent double counting across redemption, transfer, and job locks.
   - **Genuine pooled insurance:** unrelated members share eligible losses under coverage limits and capital rules. It requires premiums or another explicit funding source, underwriting, exclusions, reserves, and claims governance. Pooling can reduce idle capital when losses are sufficiently independent; correlated failures, fraud, and adverse selection can instead exhaust reserves. A token is not itself insurance capital beyond the assets backing it.

3. **Claim: Low-ticket arbitration requires unusually careful cost control.** **Support:** illustrative arithmetic, not Kleros pricing evidence. **Confidence:** high for calculations; unknown for actual inputs.
   - Assume $10 revenue, $7 fulfillment cost, and $0.20 routine fees: pre-dispute contribution is **$2.80/job**. Let dispute probability be \(p\), and incremental dispute cost be \(D\). Expected contribution before refunds/slashes is **$2.80 − pD**.
   - At illustrative **D=$20**, break-even is **p=14%**; at **D=$50**, **p=5.6%**. At 5% disputes and $20 cost, contribution is $1.80 before adverse outcomes, capital costs, acquisition, or overhead. Refunds, penalties, and appeals lower these thresholds.
   - For a customer's simple $10 refund claim, ignoring all other benefits, escalation has positive monetary expectation only if **probability of recovery × $10 exceeds expected unreimbursed fees and effort**. Fee reimbursement, bond awards, settlement, and subsidies change this calculation; none is specified.
   - Capital illustration: 100 concurrent jobs with $10 bonds immobilize **$1,000 operator capital**, separately from $1,000 customer escrow. Longer settlement or appeal windows increase required capital at a given throughput.

4. **Claim: Demand and competitive differentiation remain unproven.** **Support:** researcher inference; no market evidence inspected. **Confidence:** high that this run cannot establish demand, low on market attractiveness.
   - Research angles requiring direct verification: **ERC-8004** for identity/reputation/validation scope; **x402** for payment scope; established escrow for milestones/refunds/disputes; agent-commerce approaches for buyer authorization and spending controls. Standards proposals and vendor marketing are not evidence of paid usage or demand for bonded jobs.
   - Distinguish payment authorization and settlement from performance guarantees. A payment interface could complement escrow rather than compete with it. No claim about these named systems' current versions, usage, escrow functionality, or guarantees is verified here.

5. **Claim: Economic incentives are more important than merely adding a bond.** **Support:** threat-model inference. **Confidence:** medium; implementation-dependent.
   - Frivolous claims can immobilize operator capital even when the operator eventually wins. Challenge deposits discourage griefing but can deter valid $10 claims.
   - Operator-specific bonds lose deterrent power if claims exceed reserved capital, withdrawals precede the dispute window, or operators externalize slashing losses. Cheap new identities can discard reputation; collateral helps only if each live liability is actually funded.
   - In a shared pool, colluding customer/operator accounts could fabricate jobs or claims to extract other participants' funds. Operator-specific fully funded payouts have less third-party value to steal, absent subsidies. Arbitration corruption, evidence fabrication, and correlated failures remain separate risks; this run cannot assess Kleros's defenses.

6. **Claim: Legal classification cannot be determined from the token name or this description.** **Support:** issue-spotting inference, not legal advice or a jurisdictional conclusion. **Confidence:** high on the information gap.
   - Counsel needs jurisdiction, customer location, custody/control, redemption and transfer rights, marketing, premium structure, loss-sharing, and dispute-enforcement details. Relevant questions include payment/custody rules, investment-product treatment, insurance regulation, consumer remedies, and AML/sanctions obligations. None is resolved here.

## Contradictions
No externally verified contradictory evidence was available. Internally, “agent deposits $10” and “agent wins and gets the money” cannot establish $10 earned revenue unless the customer's separate payment is funded.

## Missing evidence
Actual customer willingness to prepay; operator willingness to lock capital; job type and objectively reviewable acceptance criteria; actual arbitration/appeal fees and timing; integration rules; loss rates and correlated exposure; bToken redemption/slashing terms; customer payment source; authoritative current competitor documentation and adoption evidence; relevant jurisdictions.

## Sources
- **Kept:** User-supplied Project B hypothetical — sole inspected input; not independent evidence.
- **Uninspected verification targets, not evidentiary citations:** [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004), [x402](https://www.x402.org/), [Kleros documentation](https://docs.kleros.io/). Current contents and status were not checked.
- **Rejected/deprioritized:** No external search results available to assess.

## Next steps
**Smallest validation experiment:** use one tightly scoped, objectively reviewable $10 job type with a handful of independent customers and operators; test separate $10 payment/$10 operator bond accounting in plain USDC, without transferable tokens or pooled coverage. Before handling funds, verify the custody/legal route. Record paid take-up, operator participation, acceptance disagreements, human resolution minutes, willingness to fund escalation, and capital lock time. A small pilot can test workflow and willingness to pay, not estimate rare fraud or pool solvency. Proceed to token or insurance design only if observed users need a benefit that plain escrow plus bonds cannot provide.
