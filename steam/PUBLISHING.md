# Shipping Ledger Survivors on Steam at $7.99

This is the real-world checklist. Steps 1–4 require a human with a credit card
and legal/tax details — they cannot be automated.

## 1. Become a Steam partner (one-time)
1. Go to https://partner.steamgames.com and sign up.
2. Pay the **$100 Steam Direct recoupable fee** per app (refunded after $1,000 in sales).
3. Complete the **digital tax interview** and banking/payout info.

## 2. Create the app
1. In Steamworks, create a new application → you'll get an **App ID**.
2. Put that App ID in `steam/steam_appid.txt` (replace the dev placeholder `480`).

## 3. Build the game
```bash
npm install
npm run dist        # builds an unpacked desktop app into ./build
```
This produces a native build (Electron) wrapping the HTML5 game.

## 4. Upload with SteamPipe
1. Install the **Steamworks SDK** and the `steamcmd` content tool.
2. Edit `steam/app_build.vdf` — set your App ID and the Depot ID.
3. Upload:
   ```bash
   steamcmd +login <your_account> +run_app_build /path/to/steam/app_build.vdf +quit
   ```

## 5. Configure the store + price
1. Fill in the store page using `steam/STORE_PAGE.md`.
2. Under **Store → Pricing**, set the base price to **USD $7.99**
   (Steam auto-suggests regional prices from this).
3. Upload capsule art + ≥ 5 screenshots (see asset table in STORE_PAGE.md).

## 6. Submit for review
1. Set a release date.
2. Submit the store page and the build for Valve review (usually a few business days).
3. After approval, hit **Release** — it goes live at $7.99.

---

### Faster alternatives if you don't want the Steam Direct fee yet
- **itch.io** — publish today, set price to $7.99, no upfront fee. Run `npm run serve`
  to test locally, or upload the `build/` folder + an HTML build.
- **Web demo** — the game already runs in any browser via `index.html`; host it anywhere.
