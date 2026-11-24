# Editable game source

The original workspace contained only the published Debug DLL and PDB. C# source was recovered from that DLL with ILSpy, then updated to support the terrain rules. Existing combat values, wave definitions, merge/craft behavior, sessions and results remain in the recovered classes.

Build from the package root with `powershell -File ./Build-Game.ps1`. Binaries are written to `build/debug`; stop the running server before copying the DLL, PDB, deps.json and runtimeconfig.json to the root.

Run the package with `Start-Game.cmd`. Run engine checks with `dotnet run --project Tests/TerrainRules.Tests.csproj`. Run `Test-TerrainHttp.ps1 -BaseUrl http://localhost:5080` and `Test-BoardAssets.ps1` against the running server.

The map is 63×63. Every mountain covers 5×5 immutable cells (25 total), with height 4. Trees occupy one immutable cell at height 3. The three-cell-wide river has three permanent wooden bridges; water and bridges reject tower placement. Default walls have roofs and height 2; player walls have height 1, including upgraded walls. Upgraded walls still stop jumping enemies. Units have height 1 and add the height of the player wall underneath.

An obstacle blocks firing when its height is greater than or equal to the unit plus its supporting wall. Supercover traversal checks corner-touching cells. The server uses this for target selection and splash damage; the client uses the same traversal to paint blocked range cells red. Hovering or selecting a unit shows the range. The unit panel reports its combined height.

Natural terrain is regenerated for a new map and preserved when replaying the same map. Enemy paths cross water only at bridges, including jumping waves. The initial camera zoom shows a portion of the expanded map; use the wheel to zoom, Shift-drag or middle-drag to pan, and Reset View to see the whole map.

Water and bridge generation prompts and PNG links are in `wwwroot/assets/terrain/seljuk/WATER-BRIDGE-PROMPTS.md`.

Gates now reserve 3x2 cells (six cells each); only the central two cells are passable. Side columns are immutable and height 2. Map generation guarantees all checkpoint routes remain connected. Mountains use an explicit 25-cell grid foundation, with no oval shadow; hovering highlights the whole footprint. The map exterior is black and drawing is clipped to its boundary. Camera zoom extends to 800 percent. Level and gate labels are drawn in screen space at a readable 13px size.
