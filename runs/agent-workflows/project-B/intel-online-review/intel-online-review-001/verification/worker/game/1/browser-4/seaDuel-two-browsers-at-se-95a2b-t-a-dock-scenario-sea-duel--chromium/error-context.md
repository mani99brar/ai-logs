# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seaDuel.spec.ts >> two browsers at sea: a grapple lands, they duel in the match (the host taps attack keys), the winner sails on protected and the loser respawns at a dock [scenario:sea-duel]
- Location: tests/e2e/seaDuel.spec.ts:47:1

# Error details

```
Error: host's duel tick p95 (ms)

expect(received).toBeLessThan(expected)

Expected: < 16
Received:   17.299999952316284
```

# Test source

```ts
  18  |  * Records, as a player would see them, every text a HUD line shows and every telegraph the sea scene draws from now
  19  |  * on: a MutationObserver catches the one-second windup however briefly it shows. `seen(page)` returns them.
  20  |  */
  21  | async function recordTelegraph(page: Page): Promise<void> {
  22  |   await page.evaluate(() => {
  23  |     const seen = { lines: [] as string[], telegraphs: [] as string[] };
  24  |     (window as unknown as { __seen: typeof seen }).__seen = seen;
  25  |     const game = document.querySelector<HTMLElement>('[data-testid="game"]')!;
  26  |     const lines = ["hud-grapple", "hud-incoming"].map((id) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!);
  27  |     new MutationObserver(() => {
  28  |       for (const line of lines) if (line.textContent !== "" && !seen.lines.includes(line.textContent!)) seen.lines.push(line.textContent!);
  29  |     }).observe(document.querySelector("#hud")!, { childList: true, characterData: true, subtree: true });
  30  |     new MutationObserver(() => seen.telegraphs.push(game.dataset["telegraphs"] ?? "[]")).observe(game, { attributes: true, attributeFilter: ["data-telegraphs"] });
  31  |   });
  32  | }
  33  | 
  34  | async function seen(page: Page): Promise<{ lines: string[]; telegraphs: DrawnTelegraph[] }> {
  35  |   const raw = await page.evaluate(() => (window as unknown as { __seen: { lines: string[]; telegraphs: string[] } }).__seen);
  36  |   return { lines: raw.lines, telegraphs: raw.telegraphs.flatMap((each) => JSON.parse(each) as DrawnTelegraph[]) };
  37  | }
  38  | 
  39  | const scene = (page: Page) => page.getByTestId("game").getAttribute("data-scene");
  40  | 
  41  | /** The 95th percentile of a list of numbers (nearest rank). */
  42  | function percentile95(values: readonly number[]): number {
  43  |   const sorted = [...values].sort((a, b) => a - b);
  44  |   return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? Number.POSITIVE_INFINITY;
  45  | }
  46  | 
  47  | test("two browsers at sea: a grapple lands, they duel in the match (the host taps attack keys), the winner sails on protected and the loser respawns at a dock [scenario:sea-duel]", async ({ browser, request }, testInfo) => {
  48  |   // A three-second countdown, a KO in about ten seconds, then the loser's fifteen-second wait.
  49  |   test.setTimeout(180_000);
  50  |   const hostContext = await browser.newContext();
  51  |   const guestContext = await browser.newContext();
  52  |   try {
  53  |     const host = await hostContext.newPage();
  54  |     const guest = await guestContext.newPage();
  55  |     const code = await createMatch(host);
  56  |     await joinMatch(guest, code);
  57  |     await startMatch(host, guest);
  58  |     const [hostId, guestId] = [await selfId(host), await selfId(guest)];
  59  | 
  60  |     // Eight tiles apart on open water, in sight but out of the grapple's six-tile range; the host faces the guest.
  61  |     await place(request, host, code, HUB_X - 4, OPEN_ROW, 0);
  62  |     await place(request, guest, code, HUB_X + 4, OPEN_ROW, 32);
  63  |     await expect.poll(async () => (await readout(host, guestId)) !== undefined).toBe(true);
  64  |     await expect(host.getByTestId("hud-grapple")).toHaveAttribute("data-state", "ready");
  65  |     await recordTelegraph(host);
  66  |     await recordTelegraph(guest);
  67  | 
  68  |     // The host sails at the guest and, once within range, presses J (a tap), and lets the ship coast on.
  69  |     await host.keyboard.down("ArrowUp");
  70  |     try {
  71  |       await expect
  72  |         .poll(
  73  |           async () => {
  74  |             const [own, target] = [await readout(host, hostId), await readout(host, guestId)];
  75  |             return own === undefined || target === undefined ? Number.POSITIVE_INFINITY : Math.hypot(target.x - own.x, target.y - own.y);
  76  |           },
  77  |           { intervals: [25], timeout: 10_000 },
  78  |         )
  79  |         .toBeLessThanOrEqual(RANGE - TILE);
  80  |       await host.keyboard.press("j");
  81  |     } finally {
  82  |       await host.keyboard.up("ArrowUp");
  83  |     }
  84  | 
  85  |     // Both saw the telegraph: the host its own aim, the guest the warning from the west.
  86  |     await expect.poll(async () => (await seen(host)).lines.some((line) => line.startsWith("Grappling, aimed east"))).toBe(true);
  87  |     await expect.poll(async () => (await seen(guest)).lines.some((line) => line.startsWith("Incoming grapple from the west"))).toBe(true);
  88  |     // The scene reports what it drew on its next animation frame, which may come just after the HUD's line.
  89  |     await expect.poll(async () => (await seen(host)).telegraphs).toContainEqual(expect.objectContaining({ attackerId: hostId, defenderId: guestId, role: "own" }));
  90  |     await expect.poll(async () => (await seen(guest)).telegraphs).toContainEqual(expect.objectContaining({ attackerId: hostId, defenderId: guestId, role: "incoming" }));
  91  | 
  92  |     // It lands: both see the three-second countdown in the arena, which replaces the sea in the same game.
  93  |     for (const page of [host, guest]) {
  94  |       await expect(page.getByTestId("duel-phase")).toHaveAttribute("data-phase", "countdown", { timeout: 5000 });
  95  |       await expect.poll(() => scene(page)).toBe("arena");
  96  |       await expect(page.locator("canvas")).toHaveCount(1);
  97  |     }
  98  |     await expect(guest.getByTestId("duel-name-1")).toHaveText("Player 2 (you)");
  99  |     for (const page of [host, guest]) await expect(page.getByTestId("duel-phase")).toHaveAttribute("data-phase", "fighting", { timeout: 15_000 });
  100 | 
  101 |     // The host wins: it keeps tapping its first special (U) at the guest, who stands still, until the KO.
  102 |     const result = host.getByTestId("duel-result");
  103 |     for (let press = 0; press < 60 && !(await result.isVisible()); press++) {
  104 |       await host.keyboard.press("u");
  105 |       await host.waitForTimeout(500);
  106 |     }
  107 |     for (const page of [host, guest]) await expect(page.getByTestId("duel-result-text")).toHaveText("Player 1 wins by KO", { timeout: 10_000 });
  108 | 
  109 |     // The match game is one Phaser game on the canvas renderer (Phaser.CANVAS) holding the sea and the arena: with
  110 |     // WebGL, headless Chromium (the GPU-less case) renders in software on the main thread and starves the duel
  111 |     // client's 4 ms tick. Its tick intervals during the fight, in both browsers: the 95th percentile is under a 60 Hz
  112 |     // frame (16 ms).
  113 |     for (const [name, page] of [["host", host], ["guest", guest]] as const) {
  114 |       const intervals = await page.evaluate(() => (window as unknown as { __duel: { tickIntervals(): number[] } }).__duel.tickIntervals());
  115 |       const p95 = percentile95(intervals);
  116 |       testInfo.annotations.push({ type: "duel-tick-interval", description: `${name}: ${intervals.length} ticks, p95 ${p95.toFixed(1)} ms, max ${Math.max(...intervals).toFixed(1)} ms` });
  117 |       expect(intervals.length, name).toBeGreaterThan(200);
> 118 |       expect(p95, `${name}'s duel tick p95 (ms)`).toBeLessThan(16);
      |                                                   ^ Error: host's duel tick p95 (ms)
  119 |     }
  120 | 
  121 |     // Back at sea: the winner with its protection shown, the loser waiting out of the world with its countdown.
  122 |     for (const page of [host, guest]) await expect.poll(() => scene(page), { timeout: 10_000 }).toBe("sea");
  123 |     await expect(host.getByTestId("hud-protection")).toHaveAttribute("data-state", "win");
  124 |     await expect(host.getByTestId("hud-protection")).toHaveText(/^Protected for [1-8] s \(won a duel\)$/);
  125 |     await expect(guest.getByTestId("hud-respawn")).toHaveText(/^Duel lost: respawning at a dock in \d+ s$/);
  126 |     const wait = Number(await guest.getByTestId("hud-respawn").getAttribute("data-seconds"));
  127 |     expect(wait).toBeGreaterThan(5);
  128 |     expect(wait).toBeLessThanOrEqual(15);
  129 |     expect(await readout(guest, guestId)).toBeUndefined();
  130 |     await expect.poll(async () => (await readout(host, guestId)) === undefined).toBe(true);
  131 | 
  132 |     // Then its ship is back, moored at a dock, with the respawn's protection.
  133 |     await expect(guest.getByTestId("hud-dock")).not.toHaveAttribute("data-dock", "-1", { timeout: 25_000 });
  134 |     const docked = (await readout(guest, guestId))!;
  135 |     expect(docked.dock).toBeGreaterThanOrEqual(0);
  136 |     const dock = seaMap.docks.find((each) => each.id === docked.dock)!;
  137 |     expect([docked.x, docked.y]).toEqual([dock.tileX * TILE + TILE / 2, dock.tileY * TILE + TILE / 2]);
  138 |     await expect(guest.getByTestId("hud-respawn")).toHaveText("");
  139 |     await expect(guest.getByTestId("hud-protection")).toHaveAttribute("data-state", "respawn");
  140 | 
  141 |     await attachScreenshot(guest, testInfo, "sea-duel");
  142 |   } finally {
  143 |     await hostContext.close();
  144 |     await guestContext.close();
  145 |   }
  146 | });
  147 | 
```