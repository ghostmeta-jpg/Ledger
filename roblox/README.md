# Overdue: Audit Arena (Roblox)

Round-based survival on a bare office floor. Red **Invoices** march in from the walls and
chase the nearest clerk; touching one costs 25 HP. Gold **Coins** litter the floor; walk over
them to bank them. Survive a 45-second wave and every living clerk gets a bonus. Waves get
bigger and faster forever. Leaderboard tracks **Coins** and **Best Wave**.

No models or assets: the whole map is built by `GameServer` at startup.

## Open in Studio
1. Install [Rojo](https://rojo.space) (`aftman add rojo-rbx/rojo` or the VS Code extension).
2. `cd roblox && rojo build -o OverdueAuditArena.rbxlx`, open that file in Roblox Studio,
   or run `rojo serve` and connect the Rojo Studio plugin to a blank baseplate.
3. Delete Studio's default `Baseplate` so the arena floor is the only ground.
4. Press **Play**.

Tuning (wave sizes, speeds, timers) lives in `src/ReplicatedStorage/WaveConfig.lua`.
