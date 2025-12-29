# ⚽ NAD-KICKERS: On-Chain Penalty Shootout

**NAD-KICKERS** is a high-octane 3D penalty shootout game built on the **Monad Testnet**. It combines immersive Three.js visuals with the verifiable fairness of blockchain technology.

## 🛡️ Verifiably Fair Gameplay
NAD-KICKERS uses **Pyth Entropy** to ensure that every goalie move, wind condition, and game outcome is generated with absolute randomness. This means neither the player nor the developer can predict or manipulate the result—ensuring a 100% fair competitive environment on Monad.

## 🚀 Key Features
- **3D Interactive Arena**: A deep-sky stadium experience powered by Three.js.
- **On-Chain Stats**: Your streaks, levels, and achievements are saved directly to the Monad blockchain.
- **"On Fire" Mechanic**: High streaks unlock cinematic visual effects.
- **Fairness Feed**: Real-time transparency into the VRF (Verifiable Randomness Function) process.

## 🛠️ Technology Stack
- **Frontend**: Next.js, Tailwind CSS, Framer Motion
- **3D Graphics**: Three.js, React Three Fiber
- **Blockchain**: Monad Testnet, Wagmi, Viem
- **Oracle**: Pyth Entropy

## 🏃 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (recommended)
- A wallet with Monad Testnet tokens

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables in `.env`:
   ```bash
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
   ```
4. Run the development server:
   ```bash
   pnpm run dev
   ```

## 📜 Smart Contract
The game logic is handled by the `PenaltyShootout` contract, which interacts with the Pyth Entropy oracle to provide tamper-proof outcomes.

---
*Built for Monad Mission X // GMONAD!*
