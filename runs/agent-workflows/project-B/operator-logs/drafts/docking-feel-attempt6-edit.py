p='/home/agentops/dev/project-B/features/docking-feel/world-task.md'; s=open(p).read()
def rep(old,new):
    global s
    assert old in s, old[:60]
    s=s.replace(old,new,1)
rep("""`dockInReach` (which the HUD's "Press E" hint also uses) returns the nearest berth whose tile is the ship's tile or one of its eight neighbours.""",
"""`dockInReach` (which the HUD's "Press E" hint also uses) returns the nearest berth where **any tile the ship's hull square overlaps** (half-size `hullHalfSize`, 80) is the berth tile or one of its eight neighbours.""")
rep("""The oracle accepts the step's start position when its tile is the berth tile or an orthogonal neighbour, or a diagonal neighbour with at least one shared tile navigable, or when the berth centre is within the reach with a clear run.""",
"""The oracle accepts the step's start position when any tile the hull square overlaps is the berth tile or an orthogonal neighbour, or a diagonal neighbour with at least one shared tile navigable, or when the berth centre is within the reach with a clear run.""")
rep("""take every position with a clear hull on a fixed 64-sub-unit grid in the ring 2–4 tiles from the berth centre.""",
"""take every position with a clear hull on a fixed 64-sub-unit grid whose tile is 2–4 tiles from the berth tile by Chebyshev distance (the max of the two tile deltas).""")
rep("""4. **The sketch writer is checked.**""","""4. **The east-side band is gone.** A scripted test on the real dock (23, 27): a ship on heading 48 in column 25 with x from 6400 to 6479 grounds in the dock's own row, with its hull overlapping (24, 27), and it moors. That is the footprint rule; the ship's centre is about 392 from the berth.
5. **The sketch writer is checked.**""")
rep("5. `docs/architecture.md`'s docking paragraph states the rule as \"on or beside the berth tile (unless pinched), or within reach with a clear run\"",
    "6. `docs/architecture.md`'s docking paragraph states the rule as \"the hull on or beside the berth tile (unless pinched), or within reach with a clear run\"")
rep("6. `npm ci` then each of the five policy checks","7. `npm ci` then each of the five policy checks")
rep("""Update `assets/source/maps/README.md` with the command.""","""Update `assets/source/maps/README.md` with the command, and fix every stale reference to the old `node assets/source/maps/sketch.ts` command (for example the test title in `maps.test.ts` and header comments).""")
open(p,'w').write(s)
d=open('/home/agentops/dev/project-B/features/docking-feel/decisions.md').read()
if "hull overlaps, not the tile under its centre" not in d:
    d=d.replace("## Assumptions","""- Corrected after design challenge attempt 5 (its alternative, adopted): "beside the berth" is decided by the tiles the hull overlaps, not the tile under its centre. This closes a mirrored dead band on the far side of the real docks, where a ship grounded in the dock's own row about 392 out.

## Assumptions""",1)
    open('/home/agentops/dev/project-B/features/docking-feel/decisions.md','w').write(d)
print("edited")
