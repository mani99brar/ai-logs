# Research: Monitoring & Optimizing Multi-Agent LLM Systems (2024–2025)

> **⚠️ Tooling limitation (read first):** The live `web_search` / `source_check` tools were **not available** in this run (only file read/write was registered). This brief is therefore assembled from established, well-known primary sources on this topic. **URLs cited are canonical locations I could not re-fetch or validate live in this session.** Treat specific numeric figures as "recalled from source, verify before quoting." Confidence labels reflect this: where I mark **high**, the claim is broadly stable and widely corroborated; where a *specific number* is involved I downgrade to **medium** pending live verification. Nothing here is invented, but numbers should be spot-checked against the linked sources before publishing externally.

## Summary
For agent teams, instrument at the **span/trace level** using OpenTelemetry GenAI semantic conventions (or LangSmith/Langfuse/Phoenix/AgentOps which map onto them), and treat **token consumption as the single strongest predictor of both cost and quality**. The highest-value metrics are per-task/per-agent token & cost, latency, turn/tool-call counts, tool error rate, and task success rate. For context, keep working context well below the model max and prefer retrieval + compaction + sub-agent isolation + prompt caching over "stuffing." For optimization, use orchestrator-worker patterns with parallel fan-out for breadth, model tiering (cheap model for simple sub-tasks), token budgets/guardrails, and evaluation loops — while heeding Cognition's warning that naive multi-agent parallelism fragments context and can degrade reliability. Alert on cost/budget burn rate, success-rate regressions, and runaway loops; present a periodic digest for trends plus real-time alerts for anomalies.

---

## 1. Observability & Analytics Metrics for Agent Teams

### What to measure (priority order)
1. **Claim:** Token consumption — broken out as **input, output, cache-read, cache-write** — is the foundational metric because it directly drives cost and correlates with quality/effort. Anthropic reported that in their multi-agent research system **token usage alone explained ~80% of the variance in performance** on their eval, and that agents used ~4× the tokens of chat and multi-agent systems ~15× the tokens of chat. **Sources:** [Anthropic – Building a multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). **Support:** direct evidence (specific % recalled — verify). **Confidence:** high (relationship) / medium (exact 80%/15× figures).
2. **Claim:** Cost should be attributed **per task, per agent, and per run/trace**, not just globally, so you can find the expensive sub-agent or tool. This is the core value of trace-based tooling (LangSmith, Langfuse, Phoenix, AgentOps), which attach token+cost to each span and roll up to the run. **Sources:** [Langfuse docs](https://langfuse.com/docs), [LangSmith docs](https://docs.smith.langchain.com/), [Arize Phoenix](https://docs.arize.com/phoenix), [AgentOps](https://www.agentops.ai/). **Support:** interpretation of documented feature sets. **Confidence:** high.
3. **Claim:** **Latency/duration** should be captured at span granularity (per LLM call, per tool call, per sub-agent) and end-to-end, because agent latency is dominated by sequential dependencies and slow tools, and multi-agent parallelism trades tokens for wall-clock speed. **Sources:** [Anthropic multi-agent system](https://www.anthropic.com/engineering/multi-agent-research-system); [OpenTelemetry GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/). **Support:** direct + interpretation. **Confidence:** high.
4. **Claim:** **Turn count, tool-call count, and tool error rate** are leading indicators of both cost blowups and reliability problems; a rising tool error rate or ballooning turn count usually precedes failed/expensive runs. **Sources:** [OpenTelemetry GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/); [AgentOps](https://www.agentops.ai/) (session/event tracking of tool calls & errors). **Support:** interpretation. **Confidence:** medium.
5. **Claim:** **Task success/completion rate** must be measured against an evaluation set (LLM-as-judge and/or human/rubric), because token/latency metrics don't tell you if the answer was *right*. All four platforms position evals + online scoring as first-class. **Sources:** [LangSmith evaluation docs](https://docs.smith.langchain.com/), [Langfuse evals](https://langfuse.com/docs), [Arize Phoenix evals](https://docs.arize.com/phoenix). **Support:** interpretation of feature docs. **Confidence:** high.
6. **Claim:** **Retry/failure rate and context-window utilization** round out the core set; context utilization (tokens used ÷ model max) is an early-warning metric for degradation and forced truncation. **Sources:** [OpenTelemetry GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/). **Support:** researcher inference (utilization ratio is a derived, not always built-in, metric). **Confidence:** medium.

### What the frameworks recommend tracking
- **OpenTelemetry GenAI semantic conventions** define standardized span names and attributes for LLM/agent operations: `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, operation/span types for chat, tool execution, and agent invocation, plus events for prompts/completions. Adopting these makes telemetry portable across vendors. **Source:** [OpenTelemetry GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/). **Support:** direct (attribute names recalled — verify exact spelling/stability status, as the spec is still evolving). **Confidence:** medium.
- **LangSmith:** hierarchical traces (runs → child runs), token & cost per run, latency, feedback scores, dataset-based evals, online evaluators. **Source:** [docs.smith.langchain.com](https://docs.smith.langchain.com/). **Confidence:** high.
- **Langfuse (open source):** traces/observations/spans/generations, cost & token tracking with model-price maps, sessions, scores/evals, dashboards. **Source:** [langfuse.com/docs](https://langfuse.com/docs). **Confidence:** high.
- **Arize Phoenix (open source):** OpenTelemetry/OpenInference-based tracing, LLM span attributes, evals, cost/latency dashboards, agent trajectory analysis. **Source:** [docs.arize.com/phoenix](https://docs.arize.com/phoenix). **Confidence:** high.
- **AgentOps:** session replays, per-event LLM/tool/action tracking, token & cost, error tracking, multi-agent visualization. **Source:** [agentops.ai](https://www.agentops.ai/). **Confidence:** medium.

**Actionable rule of thumb:** Instrument every LLM call and tool call as an OTel-GenAI span with `input_tokens`, `output_tokens`, cache-read/write tokens, model name, latency, and status; roll up to a per-run record with total cost, turn count, tool-error count, and a success/eval score. Track token usage first — it is your best single proxy for both cost and effort.

---

## 2. Context Window Sizing & Management

1. **Claim:** Model quality degrades as relevant information sits in the *middle* of a long context ("lost in the middle") — retrieval/QA accuracy is highest when key info is at the very start or end and dips in the middle, even for long-context models. **Sources:** [Liu et al., "Lost in the Middle," arXiv:2307.03172](https://arxiv.org/abs/2307.03172). **Support:** direct evidence. **Confidence:** high.
2. **Claim:** Performance degrades as *input length grows* even when the task is trivially answerable ("context rot"): models get less reliable at longer inputs, so a large context window is a budget to spend carefully, not a target to fill. **Sources:** [Chroma – "Context Rot" report, research.trychroma.com/context-rot](https://research.trychroma.com/context-rot). **Support:** direct evidence (recalled — verify specifics). **Confidence:** medium.
3. **Claim:** Anthropic's context-engineering guidance frames context as a **finite, degrading resource** and recommends curating the **smallest set of high-signal tokens**, plus three main long-horizon techniques: **compaction** (summarize/condense history as it approaches limits), **structured note-taking / external memory** (persist state outside the window), and **sub-agent architectures** (isolate detailed work in sub-agents that return only condensed results). **Sources:** [Anthropic – Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). **Support:** direct evidence. **Confidence:** high.
4. **Claim:** **Retrieval over stuffing:** pull just-in-time, relevant context (RAG / tool-based lookup) rather than pre-loading everything; Anthropic describes "just-in-time" context retrieval where agents fetch data as needed via tools instead of front-loading the window. **Sources:** [Anthropic – Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). **Support:** direct + interpretation. **Confidence:** high.
5. **Claim:** **Prompt caching** cuts both cost and latency for repeated large prefixes (system prompt, tool defs, long docs). Anthropic reports cache **reads cost ~10% of base input tokens** and **cache writes cost ~25% more** than base input; marketing cites up to **~90% cost** and **~85% latency** reductions for long, cacheable prompts. **Sources:** [Anthropic – Prompt caching docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching). **Support:** direct evidence (pricing multipliers recalled — verify current values). **Confidence:** medium.
6. **Claim:** **Sub-agent context isolation** lets each worker use its own full window for a narrow task and return a compressed summary, keeping the orchestrator's context lean — a key reason Anthropic's multi-agent system outperformed single-agent on breadth-heavy research. **Sources:** [Anthropic – Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). **Support:** direct + interpretation. **Confidence:** high.

**Actionable rules of thumb:**
- **Target utilization:** Keep the *active working context* well below the model max. A practical, widely-used heuristic (researcher inference synthesized from the degradation research above — *not* a single sourced number) is to **trigger compaction when a running conversation reaches roughly 50–70% of the window**, and to keep single-shot retrieved context far below max rather than filling it. Sources establish *that* degradation grows with length but do **not** publish one universal threshold — treat percentages as tunable, validated by your own evals.
- **Compact, don't overflow:** summarize/condense tool outputs and old turns before hitting the limit; persist detail to external notes/memory.
- **Cache the stable prefix:** put system prompt + tool definitions + static context in a cached prefix; put volatile content after it.
- **Retrieve, don't stuff:** give agents search/lookup tools rather than pasting entire corpora.

---

## 3. Advanced Optimization Techniques for Agent Teams

1. **Claim:** The **orchestrator-worker pattern** — a lead agent decomposes the task and spawns specialized sub-agents that work in parallel — is Anthropic's core multi-agent architecture; it beat their single-agent baseline substantially on internal research evals (they reported the multi-agent system outperformed a single Claude Opus agent by ~90% on their internal research eval). **Sources:** [Anthropic – Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). **Support:** direct evidence (exact % recalled — verify). **Confidence:** high (pattern) / medium (figure).
2. **Claim:** **Parallel fan-out** helps for breadth ("research", broad search, independent read-only subtasks) and cuts wall-clock time, but it multiplies token cost (hence the ~15× figure) — so parallelism is justified when task value is high and subtasks are independent, not for narrow/sequential work. **Sources:** [Anthropic – Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). **Support:** direct + interpretation. **Confidence:** high.
3. **Claim (counterpoint):** Cognition argues **"Don't build multi-agents"** for most tasks: parallel sub-agents fragment context and make implicit conflicting decisions, so reliability suffers. Their principles: **(a) share full context / the complete agent trace**, and **(b) actions carry implicit decisions — avoid conflicting ones**. They prefer a **single-threaded linear agent**, and if context gets too long, a **dedicated context-compression model** over parallel sub-agents. **Sources:** [Cognition – "Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents). **Support:** direct evidence. **Confidence:** high.
   - **Synthesis (researcher inference):** The two views reconcile by task type — multi-agent/fan-out for **read-only, parallelizable breadth** (research, gathering) where sub-results merge cleanly; single-threaded + compaction for **stateful, write-heavy, tightly-coupled** tasks (coding) where actions conflict. Treat "spawn sub-agent vs. compact in place" as a decision keyed on subtask independence.
4. **Claim:** **Model routing/tiering** (cheap/fast model for simple or high-volume sub-tasks, frontier model for hard reasoning/orchestration) is a standard cost lever; route by task difficulty/classification. **Sources:** provider guidance broadly (e.g., [Anthropic model selection docs](https://docs.anthropic.com/), routing patterns in [Langfuse](https://langfuse.com/docs)). **Support:** interpretation. **Confidence:** medium (widely practiced; no single canonical numeric benchmark verified here).
5. **Claim:** **Caching + batching + token budgets/guardrails** are the main cost-control mechanisms: cache stable prefixes (§2), batch independent calls, and cap max tokens/turns/tool-calls per agent to prevent runaway spend. Anthropic explicitly discusses giving agents budgets and heuristics for effort scaling. **Sources:** [Anthropic – Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), [Anthropic – Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching). **Support:** direct + interpretation. **Confidence:** high.
6. **Claim:** **Evaluation loops** (LLM-as-judge + small curated test sets + trajectory review) are how you know an optimization helped; Anthropic emphasizes starting evals early with small sample sizes and using LLM judges against rubrics. **Sources:** [Anthropic – Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). **Support:** direct evidence. **Confidence:** high.

**Actionable rules of thumb:**
- Use **orchestrator-worker + parallel fan-out only for independent, read-only breadth subtasks**; keep coupled/stateful work single-threaded.
- **Scale effort to task value:** simple query → 1 agent / few tool calls; complex research → orchestrator + N sub-agents with explicit budgets. Tell the orchestrator the budget.
- **Route by difficulty:** cheap model for classification/extraction/summarize-subtask; frontier model for planning and hard reasoning.
- **When to compact vs. spawn:** compact/summarize in place for continuous, stateful threads; spawn a fresh isolated sub-agent for a self-contained subtask whose only output is a condensed result.
- Cap per-agent max turns, max tool calls, and max tokens as hard guardrails against loops.

---

## 4. Alerting & Reporting Patterns

1. **Claim:** The most useful **alert triggers** for agent teams are: (a) **cost spike / budget burn-rate** exceeding threshold, (b) **success/eval-score regression**, (c) **runaway loops** (turn/tool-call count or token count exceeding a cap), (d) **tool error-rate spike**, and (e) **latency regression**. These map directly to the metrics in §1. **Sources:** synthesized from [OpenTelemetry GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/) + platform alerting features ([Langfuse](https://langfuse.com/docs), [LangSmith](https://docs.smith.langchain.com/)). **Support:** researcher inference grounded in documented metrics. **Confidence:** medium.
2. **Claim:** **Burn-rate alerting** (borrowed from SRE error-budget practice) is the right model for cost: alert on *rate of spend over a rolling window* (e.g., short + long window multi-burn-rate) rather than a single cumulative number, to catch fast anomalies without noise. **Sources:** [Google SRE Workbook – Alerting on SLOs / burn rate](https://sre.google/workbook/alerting-on-slos/). **Support:** direct evidence for the burn-rate method (applied here by inference to token cost). **Confidence:** medium.
3. **Claim:** **Presentation:** use **real-time alerts** (paging/Slack) only for anomalies needing action (cost spike, loop, hard failure), and a **periodic digest/dashboard** (daily or per-run summary) for trends — cost per task over time, success rate, top-cost agents/tools, context-utilization distribution. Dashboards for exploration; digests for routine review. **Sources:** interpretation of observability tooling norms ([Langfuse dashboards](https://langfuse.com/docs), [Phoenix](https://docs.arize.com/phoenix)). **Support:** researcher inference. **Confidence:** medium.

**Actionable rules of thumb (tune to your baseline):**
- **Cost/budget:** alert when a run exceeds N× its historical median cost, or when hourly/daily burn rate projects over budget. Hard-stop runs exceeding an absolute per-run token/cost cap.
- **Runaway loop:** hard cap per agent (e.g., max turns and max tool calls); alert *before* the cap so a human can intervene.
- **Quality:** alert when rolling success/eval score drops more than X points vs. trailing baseline.
- **Cadence:** immediate alerts for anomalies; a per-run scorecard; and a daily/weekly digest with cost-per-task, success trend, top expensive agents/tools, tool-error leaderboard, and context-utilization percentiles.

---

## Design implications for an automated monitoring + improvement-suggestion workflow

- **Collect:** OTel-GenAI spans → per-run record: `{input/output/cache tokens, cost, latency, turns, tool_calls, tool_errors, context_utilization, success_score}` attributed per agent and per tool.
- **Baseline:** maintain rolling medians/percentiles per task type so anomalies are relative, not absolute.
- **Recommend (rule engine):**
  - High token/cost + low success → suggest model down-tiering for cheap subtasks, tighter budgets, or prompt-caching the stable prefix.
  - High context utilization + degrading success → suggest compaction/retrieval/sub-agent isolation.
  - High turn/tool-call count with retries → suggest loop guardrails, better tool descriptions, or single-threaded refactor (Cognition point).
  - Parallelizable read-only breadth with slow latency → suggest orchestrator-worker fan-out.
- **Verify:** every suggested change is gated behind an eval-set run (§3.6) before/after comparison.

---

## Contradictions
- **Multi-agent fan-out vs. single-threaded:** Anthropic advocates orchestrator-worker + parallel sub-agents (strong results on research/breadth tasks); Cognition ("Don't Build Multi-Agents") argues parallel sub-agents fragment context and hurt reliability, favoring single-threaded + context compression. Sources: [Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system) vs. [Cognition](https://cognition.ai/blog/dont-build-multi-agents). Reconciled by task type (independent read-only breadth vs. coupled stateful work) — this reconciliation is researcher inference.
- **Context window "target %":** degradation research (lost-in-the-middle, context rot) shows *that* longer context degrades quality but does **not** publish a single canonical utilization threshold; specific % targets in this brief are heuristics, not sourced constants.

## Missing evidence
- No live-verified, current (2024-2025) numeric figures — all specific numbers (80% variance, 15×, 90% cost / 85% latency, cache multipliers, ~90% eval win) are **recalled from memory of the cited sources and were NOT re-verified live** due to missing search tooling. Verify each before external use.
- Exact, stable OpenTelemetry GenAI attribute names and their maturity status (the spec is actively evolving) not confirmed live.
- No verified, vendor-neutral benchmark for model-routing cost savings.
- No confirmation of current AgentOps / Phoenix / Langfuse / LangSmith specific dashboard/alerting feature sets as of the latest release.

## Sources
- **Kept (canonical, high value):**
  - Anthropic – Building a multi-agent research system (https://www.anthropic.com/engineering/multi-agent-research-system) — orchestrator-worker, token-as-performance, evals.
  - Anthropic – Effective context engineering for AI agents (https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — compaction, notes, sub-agents, just-in-time retrieval.
  - Cognition – Don't Build Multi-Agents (https://cognition.ai/blog/dont-build-multi-agents) — single-threaded counterpoint, context sharing.
  - Liu et al. – Lost in the Middle (https://arxiv.org/abs/2307.03172) — positional degradation in long context.
  - Chroma – Context Rot (https://research.trychroma.com/context-rot) — degradation with input length.
  - Anthropic – Prompt caching docs (https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) — cost/latency savings, cache pricing.
  - OpenTelemetry – GenAI semantic conventions (https://opentelemetry.io/docs/specs/semconv/gen-ai/) — standardized agent/LLM telemetry.
  - Langfuse (https://langfuse.com/docs), LangSmith (https://docs.smith.langchain.com/), Arize Phoenix (https://docs.arize.com/phoenix), AgentOps (https://www.agentops.ai/) — observability feature sets.
  - Google SRE Workbook – Alerting on SLOs (https://sre.google/workbook/alerting-on-slos/) — burn-rate alerting model.
- **Deprioritized:** generic vendor marketing/SEO blog roundups on "LLM observability" — redundant with primary docs.

## Next steps
1. Re-run with live `web_search`/`source_check` to **verify every numeric figure** flagged above (especially Anthropic's 80% variance / 15× tokens / 90% eval win, and current prompt-cache pricing multipliers).
2. Confirm current OpenTelemetry GenAI attribute names + stability status against the live spec.
3. Pull the latest alerting/dashboard capabilities from each platform's current docs to map "what the tool can alert on" to the §4 rule set.
