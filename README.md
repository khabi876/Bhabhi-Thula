# Bhabhi Thulla (Get Away) - Pakistani Multiplayer Card Game

An authentic, production-grade digital adaptation of the traditional Pakistani card game **Bhabhi Thulla** (also known as *Get Away* or *Bhabhi*).

Features real-time WebSocket multiplayer across 3 or 4 connected devices, smart AI bots, landscape-first card room interface, dramatic Thulla shockwaves, Urdu and Punjabi match commentary, and private Master testing inspection.

---

## 🚀 Quick Start / Installation Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ (comes with Node.js)

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd bhabhi-thulla
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```
Key variables in `.env`:
- `PORT`: Server port (default: `3000`)
- `MASTER_ACCESS_PASSCODE`: Master test mode secret (default: `bhabhi_master_secret`)

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser or connect from your phone/tablet on the same local network (`http://<your-local-ip>:3000`).

### 5. Run Automated Unit Tests
```bash
npm test
```
Runs 29 engine assertions verifying 52-card uniqueness, 3/4-player dealing, suit following, Thulla resolution, bot AI decisions, and password-protected force end game.

### 6. Production Build & Start
```bash
# Build optimized client bundle
npm run build

# Start production server
npm start
```

---

## 🔒 End Game Feature (Password Protected)

During an active match, any authorized host or player can immediately resolve and end the game early:
1. Click the red **"End Game"** button with the flag icon in the top game HUD bar.
2. In the confirmation dialog, enter the designated password:
   ```text
   malik123
   ```
3. The server validates the password, calculates final rankings based on remaining cards, and declares the player with the most cards as the **Bhabhi**.

*(The Master Testing panel also has an End Game shortcut accepting the same password).*

---

## ⚙️ GitHub Actions Auto-Build (`.github/workflows/build.yml`)

The repository includes a ready-to-run GitHub Actions workflow that:
- Triggers automatically on every `push` and `pull_request` to `main` / `master`.
- Can be manually triggered anytime via **Workflow Dispatch** under GitHub's **Actions** tab.
- Runs `npm run lint` for code and type validation.
- Runs `npm test` for the complete game engine test suite.
- Builds the production bundle with `npm run build`.
- Automatically packages and uploads downloadable build artifacts (`bhabhi-thulla-release-<sha>`) retained for 30 days!

---

## 🎮 How to Play

1. **Objective**: Get rid of all your cards! The last player holding cards when everyone else escapes becomes the **Bhabhi**.
2. **First Trick**: The player holding the **Ace of Spades ($♠A$)** must lead trick 1.
3. **Follow Suit**: Players must play a card matching the lead suit if they hold one.
4. **The Thulla**: If a player cannot follow suit, they throw an off-suit card. The player who threw the highest card of the lead suit collects all cards on the table.
5. **Next Lead**: The player who gave the Thulla leads the next trick.
