-- Shows the server's Status string at the top of the screen.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local status = ReplicatedStorage:WaitForChild("Status")

local gui = Instance.new("ScreenGui")
gui.Name = "HUD"
gui.ResetOnSpawn = false
gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0.5, 0, 0, 44)
label.Position = UDim2.new(0.25, 0, 0, 12)
label.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
label.BackgroundTransparency = 0.3
label.TextColor3 = Color3.fromRGB(255, 207, 77)
label.TextScaled = true
label.Font = Enum.Font.GothamBold
label.Text = status.Value
label.Parent = gui

status.Changed:Connect(function(v) label.Text = v end)
