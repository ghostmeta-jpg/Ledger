-- Overdue: Audit Arena — server. Builds the arena, runs waves, moves invoices, pays coins.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local WaveConfig = require(ReplicatedStorage:WaitForChild("WaveConfig"))

local HALF = WaveConfig.ARENA_SIZE / 2

local status = Instance.new("StringValue")
status.Name = "Status"
status.Value = "Waiting for clerks..."
status.Parent = ReplicatedStorage

-- Arena -----------------------------------------------------------------------
local function block(name, size, cframe, color, parent)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cframe
	p.Anchored = true
	p.Color = color
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent or workspace
	return p
end

local arena = Instance.new("Folder")
arena.Name = "Arena"
arena.Parent = workspace

block("Floor", Vector3.new(WaveConfig.ARENA_SIZE, 1, WaveConfig.ARENA_SIZE), CFrame.new(0, -0.5, 0), Color3.fromRGB(230, 225, 205), arena)
for _, axis in ipairs({ Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0), Vector3.new(0, 0, 1), Vector3.new(0, 0, -1) }) do
	local size = if axis.X ~= 0 then Vector3.new(2, 12, WaveConfig.ARENA_SIZE) else Vector3.new(WaveConfig.ARENA_SIZE, 12, 2)
	block("Wall", size, CFrame.new(axis * (HALF + 1) + Vector3.new(0, 6, 0)), Color3.fromRGB(90, 90, 100), arena)
end

local spawnLoc = Instance.new("SpawnLocation")
spawnLoc.Size = Vector3.new(12, 1, 12)
spawnLoc.CFrame = CFrame.new(0, 0.5, 0)
spawnLoc.Anchored = true
spawnLoc.Color = Color3.fromRGB(127, 209, 127)
spawnLoc.Parent = arena

local function randomFloorPos(y)
	return Vector3.new(math.random(-HALF + 6, HALF - 6), y, math.random(-HALF + 6, HALF - 6))
end

-- Leaderstats -----------------------------------------------------------------
local function stat(player, name)
	return player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild(name)
end

Players.PlayerAdded:Connect(function(player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	for _, n in ipairs({ "Coins", "Best Wave" }) do
		local v = Instance.new("IntValue")
		v.Name = n
		v.Parent = ls
	end
	ls.Parent = player
end)

-- Coins -----------------------------------------------------------------------
local coins = Instance.new("Folder")
coins.Name = "Coins"
coins.Parent = workspace

local function spawnCoin()
	local c = block("Coin", Vector3.new(2, 2, 0.5), CFrame.new(randomFloorPos(2)), Color3.fromRGB(255, 207, 77), coins)
	c.Shape = Enum.PartType.Cylinder
	c.Material = Enum.Material.Neon
	c.CanCollide = false
	local taken = false
	c.Touched:Connect(function(hit)
		if taken then return end
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		local coinStat = player and stat(player, "Coins")
		if not coinStat then return end
		taken = true
		coinStat.Value += 1
		c:Destroy()
		task.delay(5, spawnCoin)
	end)
end
for _ = 1, WaveConfig.COIN_COUNT do spawnCoin() end

-- Invoices (enemies) ----------------------------------------------------------
local invoices = Instance.new("Folder")
invoices.Name = "Invoices"
invoices.Parent = workspace

local lastHit = {} -- [invoice][player] = os.clock()

local function spawnInvoice(wave)
	-- spawn on the arena edge so they march in from the walls
	local edge = HALF - 4
	local pos = if math.random() < 0.5
		then Vector3.new(math.random() < 0.5 and -edge or edge, 2, math.random(-edge, edge))
		else Vector3.new(math.random(-edge, edge), 2, math.random() < 0.5 and -edge or edge)
	local inv = block("Invoice", Vector3.new(4, 4, 4), CFrame.new(pos), Color3.fromRGB(220, 50, 60), invoices)
	inv.Material = Enum.Material.Neon
	inv.CanCollide = false
	inv:SetAttribute("Speed", WaveConfig.enemySpeed(wave))
	lastHit[inv] = {}
end

local function nearestRoot(fromPos)
	local best, bestDist
	for _, player in ipairs(Players:GetPlayers()) do
		local char = player.Character
		local root = char and char:FindFirstChild("HumanoidRootPart")
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		if root and hum and hum.Health > 0 then
			local d = (root.Position - fromPos).Magnitude
			if not bestDist or d < bestDist then
				best, bestDist = root, d
			end
		end
	end
	return best, bestDist
end

RunService.Heartbeat:Connect(function(dt)
	for _, inv in ipairs(invoices:GetChildren()) do
		local root, dist = nearestRoot(inv.Position)
		if not root then continue end
		local target = Vector3.new(root.Position.X, 2, root.Position.Z)
		local step = math.min(inv:GetAttribute("Speed") * dt, dist)
		inv.CFrame = CFrame.lookAt(inv.Position, target) * CFrame.new(0, 0, -step)
		if dist <= WaveConfig.HIT_RANGE then
			local player = Players:GetPlayerFromCharacter(root.Parent)
			local hits = lastHit[inv]
			if player and hits and os.clock() - (hits[player] or 0) >= WaveConfig.HIT_COOLDOWN then
				hits[player] = os.clock()
				root.Parent.Humanoid:TakeDamage(WaveConfig.HIT_DAMAGE)
			end
		end
	end
end)

local function clearInvoices()
	for _, inv in ipairs(invoices:GetChildren()) do
		lastHit[inv] = nil
		inv:Destroy()
	end
end

-- Round loop ------------------------------------------------------------------
local function countdown(prefix, seconds)
	for t = seconds, 1, -1 do
		status.Value = string.format("%s %d", prefix, t)
		task.wait(1)
	end
end

local wave = 0
while true do
	if #Players:GetPlayers() == 0 then
		status.Value = "Waiting for clerks..."
		wave = 0
		task.wait(1)
		continue
	end

	countdown("Next audit in", WaveConfig.INTERMISSION)
	wave += 1
	for _ = 1, WaveConfig.enemyCount(wave) do spawnInvoice(wave) end
	countdown(string.format("Wave %d — survive!", wave), WaveConfig.ROUND_LENGTH)
	clearInvoices()

	for _, player in ipairs(Players:GetPlayers()) do
		local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
		if hum and hum.Health > 0 then
			local c, best = stat(player, "Coins"), stat(player, "Best Wave")
			if c then c.Value += WaveConfig.survivalBonus(wave) end
			if best and wave > best.Value then best.Value = wave end
		end
	end
	status.Value = string.format("Wave %d cleared! Survivors +%d coins", wave, WaveConfig.survivalBonus(wave))
	task.wait(3)
end
