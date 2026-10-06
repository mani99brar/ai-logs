# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sea.spec.ts >> sail around a shoal to an island dock and dock there [scenario:sail-and-dock]
- Location: tests/e2e/sea.spec.ts:30:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('hud-dock')
Expected: "Palm Key, south dock"
Received: "at sea"
Timeout:  10000ms

Call log:
  - Expect "toHaveText" getByTestId('hud-dock') with timeout 10000ms
  - waiting for getByTestId('hud-dock')
    23 × locator resolved to <dd data-dock="-1" data-testid="hud-dock">at sea</dd>
       - unexpected value "at sea"

```

```yaml
- definition: at sea
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { DOCK_COLOR, FOG_COLOR, LAND_COLORS, SEA_COLOR, SHOAL_COLOR } from "../../apps/web/src/palette.js";
  3   | import { dockLabel, isNavigable, seaMap, SIGHT_RADIUS_TILES, Terrain, terrainAt } from "../../packages/content/src/index.js";
  4   | import {
  5   |   attachScreenshot,
  6   |   colourAt,
  7   |   createMatch,
  8   |   drawnIds,
  9   |   fogRevealed,
  10  |   joinMatch,
  11  |   listedIds,
  12  |   minimapShows,
  13  |   ownColour,
  14  |   ownDrawnPosition,
  15  |   place,
  16  |   readout,
  17  |   sailTo,
  18  |   selfId,
  19  |   shipsOnCanvas,
  20  |   tileColourShare,
  21  |   TILE,
  22  | } from "./helpers.js";
  23  | 
  24  | // Sailing with the keyboard takes real time, and a software-rendered browser on a busy machine reads the HUD slowly.
  25  | test.describe.configure({ timeout: 120_000 });
  26  | 
  27  | const centre = (tileX: number, tileY: number) => ({ x: tileX * TILE + TILE / 2, y: tileY * TILE + TILE / 2 });
  28  | const SIGHT = SIGHT_RADIUS_TILES * TILE;
  29  | 
  30  | test("sail around a shoal to an island dock and dock there [scenario:sail-and-dock]", async ({ page, request }, testInfo) => {
  31  |   // Palm Key's south dock, with a shoal bar across the water south of it.
  32  |   const palm = seaMap.islands.findIndex((island) => island.name === "Palm Key");
  33  |   const dock = seaMap.docks.find((each) => each.island === palm && each.side === "S")!;
  34  |   const start = { tileX: dock.tileX, tileY: dock.tileY + 10 };
  35  |   // The straight course from the start to the dock runs over the shoal.
  36  |   const shoalOnCourse = Array.from({ length: start.tileY - dock.tileY }, (_, step) => terrainAt(seaMap, dock.tileX, dock.tileY + 1 + step));
  37  |   expect(shoalOnCourse).toContain(Terrain.Shoal);
  38  |   const shoalRows = shoalOnCourse.flatMap((kind, step) => (kind === Terrain.Shoal ? [dock.tileY + 1 + step] : []));
  39  |   let shoalEnd = dock.tileX;
  40  |   while (terrainAt(seaMap, shoalEnd + 1, shoalRows[0]!) === Terrain.Shoal) shoalEnd++;
  41  | 
  42  |   const code = await createMatch(page);
  43  |   await place(request, page, code, start.tileX, start.tileY, 48);
  44  |   await expect(page.getByTestId("hud-dock")).toHaveText("at sea");
  45  |   const waypoints = [
  46  |     { tileX: shoalEnd + 3, tileY: shoalRows.at(-1)! + 2 },
  47  |     { tileX: shoalEnd + 3, tileY: shoalRows[0]! - 2 },
  48  |     { tileX: dock.tileX, tileY: dock.tileY },
  49  |   ];
  50  | 
  51  |   // The minimap's fog before sailing. Wait until the ship is drawn at the start: the jump from the spawn slot is drawn
  52  |   // as a fast glide that clears fog on its way, so only what is still fogged now can be cleared by sailing. The
  53  |   // candidates are open-sea tiles out of sight of the start but well within sight of a waypoint (so their minimap
  54  |   // pixel, which blends a tile with its neighbours, turns wholly to sea); the ones still fogged must all clear. Some
  55  |   // always are: even a glide that cleared everything along its line would leave one.
  56  |   await expect.poll(() => ownDrawnPosition(page)).toEqual(centre(start.tileX, start.tileY));
  57  |   const fogAtStart = await fogRevealed(page);
  58  |   const beside: { tileX: number; tileY: number }[] = [];
  59  |   for (let tileY = dock.tileY - 8; tileY <= start.tileY; tileY++) {
  60  |     for (let tileX = dock.tileX - 8; tileX <= shoalEnd + 12; tileX++) {
  61  |       const openSea = [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => terrainAt(seaMap, tileX + dx, tileY + dy) === Terrain.Sea));
  62  |       const outOfSightAtStart = (tileX - start.tileX) ** 2 + (tileY - start.tileY) ** 2 > (SIGHT_RADIUS_TILES + 1) ** 2;
  63  |       const nearRoute = waypoints.some((point) => (tileX - point.tileX) ** 2 + (tileY - point.tileY) ** 2 <= 7 * 7);
  64  |       const offTheBerth = (tileX - dock.tileX) ** 2 + (tileY - dock.tileY) ** 2 >= 5 * 5;
  65  |       if (openSea && outOfSightAtStart && nearRoute && offTheBerth) beside.push({ tileX, tileY });
  66  |     }
  67  |   }
  68  |   const foggedAtStart = await minimapShows(page, beside, FOG_COLOR);
  69  |   const stillFogged = beside.filter((_, index) => foggedAtStart[index]);
  70  |   expect(stillFogged.length).toBeGreaterThan(0);
  71  | 
  72  |   // Round the east end of the shoal with the keyboard, then run in to the dock.
  73  |   const visited: { x: number; y: number }[] = [];
  74  |   const record = (ship: { x: number; y: number }) => visited.push(ship);
  75  |   const fogAlong = [fogAtStart];
  76  |   for (const point of waypoints) {
  77  |     await sailTo(page, centre(point.tileX, point.tileY), { within: TILE, onReadout: record });
  78  |     fogAlong.push(await fogRevealed(page));
  79  |   }
  80  |   const berth = centre(dock.tileX, dock.tileY);
  81  | 
  82  |   // Beside the dock the HUD says how to dock there.
  83  |   await expect(page.getByTestId("hud-dock-hint")).toHaveText(new RegExp(`to dock at ${dockLabel(seaMap, dock.id)}$`), { timeout: 10_000 });
  84  | 
  85  |   // Close in: no throttle, E held, until the server moors the ship.
  86  |   await page.keyboard.down("KeyE");
> 87  |   await expect(page.getByTestId("hud-dock")).toHaveText(dockLabel(seaMap, dock.id), { timeout: 10_000 });
      |                                              ^ Error: expect(locator).toHaveText(expected) failed
  88  |   await page.keyboard.up("KeyE");
  89  |   expect(dockLabel(seaMap, dock.id)).toBe("Palm Key, south dock");
  90  |   await expect(page.getByTestId("hud-dock-hint")).toHaveText("");
  91  | 
  92  |   // The ship stops at the dock and stays there.
  93  |   const self = await selfId(page);
  94  |   const moored = (await readout(page, self))!;
  95  |   expect(moored).toMatchObject({ ...berth, speed: 0, dock: dock.id });
  96  |   await page.waitForTimeout(500);
  97  |   expect(await readout(page, self)).toEqual(moored);
  98  |   // It went round the shoal, never over it.
  99  |   expect(visited.length).toBeGreaterThan(10);
  100 |   for (const point of visited) expect(isNavigable(seaMap, Math.floor(point.x / TILE), Math.floor(point.y / TILE))).toBe(true);
  101 |   expect(visited.some((point) => Math.floor(point.x / TILE) > shoalEnd)).toBe(true);
  102 |   await expect.poll(() => shipsOnCanvas(page)).toEqual([self]);
  103 | 
  104 |   // The tile map is on the canvas: land, the shoal bar, the island's other dock and open sea each show their
  105 |   // placeholder colour, sampled at the tile through the camera's scroll.
  106 |   const island = seaMap.islands[palm]!;
  107 |   const otherDock = seaMap.docks.find((each) => each.island === palm && each.id !== dock.id)!;
  108 |   const tiles = [
  109 |     { name: "land", tileX: dock.tileX, tileY: dock.tileY - 4, kind: Terrain.Land, color: LAND_COLORS[island.theme] },
  110 |     { name: "shoal", tileX: dock.tileX, tileY: shoalRows[0]!, kind: Terrain.Shoal, color: SHOAL_COLOR },
  111 |     { name: "dock", tileX: otherDock.tileX, tileY: otherDock.tileY, kind: Terrain.Dock, color: DOCK_COLOR },
  112 |     { name: "sea", tileX: dock.tileX, tileY: dock.tileY + 2, kind: Terrain.Sea, color: SEA_COLOR },
  113 |   ];
  114 |   for (const each of tiles) {
  115 |     expect(terrainAt(seaMap, each.tileX, each.tileY), each.name).toBe(each.kind);
  116 |     await expect.poll(() => tileColourShare(page, each.tileX, each.tileY, each.color), { message: `${each.name} tile` }).toBeGreaterThan(0.75);
  117 |   }
  118 |   // And not by accident: land is not drawn in the shoal colour, nor the shoal in the sea colour.
  119 |   expect(await tileColourShare(page, tiles[0]!.tileX, tiles[0]!.tileY, SHOAL_COLOR)).toBe(0);
  120 |   expect(await tileColourShare(page, tiles[1]!.tileX, tiles[1]!.tileY, SEA_COLOR)).toBe(0);
  121 | 
  122 |   // The fog cleared along the sailed path: the revealed count grew leg by leg, and every candidate tile that was still
  123 |   // fogged at the start now shows the sea on the minimap.
  124 |   expect(fogAlong).toEqual([...fogAlong].sort((a, b) => a - b));
  125 |   expect(fogAlong.at(-1)!).toBeGreaterThan(fogAtStart);
  126 |   expect(await minimapShows(page, stillFogged, SEA_COLOR)).toEqual(stillFogged.map(() => true));
  127 | 
  128 |   await attachScreenshot(page, testInfo, "sail-and-dock");
  129 | 
  130 |   // Any throttle casts off.
  131 |   await page.keyboard.down("ArrowDown");
  132 |   await expect(page.getByTestId("hud-dock")).toHaveText("at sea");
  133 |   await page.keyboard.up("ArrowDown");
  134 | });
  135 | 
  136 | test("ships out of sight are neither listed nor drawn until one sails within sight [scenario:out-of-sight]", async ({ browser, request }, testInfo) => {
  137 |   const hostContext = await browser.newContext();
  138 |   const guestContext = await browser.newContext();
  139 |   try {
  140 |     const host = await hostContext.newPage();
  141 |     const guest = await guestContext.newPage();
  142 |     const code = await createMatch(host);
  143 |     await joinMatch(guest, code);
  144 |     await expect(guest.getByTestId("hud-players")).toHaveText("2");
  145 | 
  146 |     // Sixteen tiles apart on open sea, the guest facing the host: out of sight, but on each other's screen.
  147 |     const row = 76;
  148 |     await place(request, host, code, 100, row, 0);
  149 |     await place(request, guest, code, 116, row, 32);
  150 |     const hostId = await selfId(host);
  151 |     const guestId = await selfId(guest);
  152 |     const hostShip = (await readout(host, hostId))!;
  153 |     const [hostColour, guestColour] = [await ownColour(host), await ownColour(guest)];
  154 | 
  155 |     const expectApart = async () => {
  156 |       await expect.poll(() => listedIds(guest)).toEqual([guestId]);
  157 |       await expect.poll(() => listedIds(host)).toEqual([hostId]);
  158 |       await expect.poll(() => drawnIds(guest)).toEqual([guestId]);
  159 |       await expect.poll(() => drawnIds(host)).toEqual([hostId]);
  160 |       // Nothing of the other ship's colour where it actually is, on either canvas.
  161 |       const guestShip = (await readout(guest, guestId))!;
  162 |       expect(await colourAt(guest, hostShip.x, hostShip.y, hostColour)).toBe(false);
  163 |       expect(await colourAt(host, guestShip.x, guestShip.y, guestColour)).toBe(false);
  164 |       // Both still know there are two players.
  165 |       await expect(host.getByTestId("hud-players")).toHaveText("2");
  166 |     };
  167 |     await expectApart();
  168 | 
  169 |     // The guest sails toward the host with the keyboard until the host comes into sight.
  170 |     await guest.keyboard.down("ArrowUp");
  171 |     await expect.poll(() => listedIds(guest), { timeout: 15_000 }).toEqual([hostId, guestId].sort());
  172 |     await guest.keyboard.up("ArrowUp");
  173 |     const closing = (await readout(guest, guestId))!;
  174 |     expect(Math.hypot(closing.x - hostShip.x, closing.y - hostShip.y)).toBeLessThanOrEqual(SIGHT + 3 * 64);
  175 |     await expect.poll(() => listedIds(host)).toEqual([hostId, guestId].sort());
  176 |     await expect.poll(() => shipsOnCanvas(guest)).toEqual([hostId, guestId].sort());
  177 |     await expect.poll(() => shipsOnCanvas(host)).toEqual([hostId, guestId].sort());
  178 | 
  179 |     // It turns about and sails away east until the host drops out of sight again.
  180 |     await sailTo(guest, { x: 140 * TILE, y: hostShip.y }, { until: async () => !(await listedIds(guest)).includes(hostId) });
  181 |     const away = (await readout(guest, guestId))!;
  182 |     expect(Math.hypot(away.x - hostShip.x, away.y - hostShip.y)).toBeGreaterThan(SIGHT - 3 * 64);
  183 |     // Let it coast to a stop out of sight before checking both views.
  184 |     await expect.poll(async () => (await readout(guest, guestId))!.speed, { timeout: 10_000 }).toBe(0);
  185 |     await expectApart();
  186 | 
  187 |     await attachScreenshot(guest, testInfo, "out-of-sight");
```