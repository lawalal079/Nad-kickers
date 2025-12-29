import { ethers } from "hardhat";

async function main() {
    // Monad Testnet Pyth Entropy Address loaded from environment
    const entropyAddress = process.env.PYTH_ENTROPY_ADDRESS;
    if (!entropyAddress) {
        throw new Error("PYTH_ENTROPY_ADDRESS not set in .env");
    }

    console.log("Deploying PenaltyShootout to Monad Testnet...");

    const PenaltyShootout = await ethers.getContractFactory("PenaltyShootout");
    const game = await PenaltyShootout.deploy(entropyAddress);

    await game.waitForDeployment();

    console.log(`PenaltyShootout deployed to: ${await game.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
