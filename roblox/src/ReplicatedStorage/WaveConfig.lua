-- Tuning for Overdue: Audit Arena. Shared by server (spawning) and client (HUD).
local WaveConfig = {}

WaveConfig.INTERMISSION = 10 -- seconds between waves
WaveConfig.ROUND_LENGTH = 45 -- seconds a wave lasts
WaveConfig.ARENA_SIZE = 160 -- studs, square
WaveConfig.COIN_COUNT = 24
WaveConfig.HIT_RANGE = 4 -- studs from invoice center to player root
WaveConfig.HIT_DAMAGE = 25
WaveConfig.HIT_COOLDOWN = 1 -- seconds per player per invoice

function WaveConfig.enemyCount(wave)
	return 3 + wave * 2
end

function WaveConfig.enemySpeed(wave)
	return math.min(10 + wave * 1.5, 24)
end

function WaveConfig.survivalBonus(wave)
	return wave * 5
end

-- self-check: runs once when the module first loads
assert(WaveConfig.enemyCount(1) == 5, "wave 1 should spawn 5 invoices")
assert(WaveConfig.enemySpeed(1) < WaveConfig.enemySpeed(2), "speed must ramp")
assert(WaveConfig.enemySpeed(100) == 24, "speed must cap at 24")
assert(WaveConfig.survivalBonus(3) == 15, "bonus is 5 per wave")

return WaveConfig
