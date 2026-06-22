// Electron wrapper so the game ships as a native desktop app on Steam.
// Steam's overlay, achievements, and cloud saves attach to this executable.
const { app, BrowserWindow } = require("electron");
const path = require("path");

// --- Optional Steamworks hook -------------------------------------------
// To wire up achievements / overlay, drop your Steam App ID in
// steam/steam_appid.txt and install `steamworks.js`, then uncomment:
//
//   const steamworks = require("steamworks.js");
//   const client = steamworks.init(Number(process.env.STEAM_APPID) || 480);
//
// 480 ("Spacewar") is Valve's public test App ID for development.

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: true,
    fullscreenable: true,
    backgroundColor: "#05060c",
    title: "Ledger Survivors",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
