import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

export function startReactivityListener() {
    console.log("🟢 Starting Somnia Reactivity Engine...");

    const WS_URL = 'wss://dream-rpc.somnia.network/ws';
    const provider = new ethers.WebSocketProvider(WS_URL);

    // Pull the private key securely from Render's environment variables
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ RELAYER_PRIVATE_KEY is missing in .env!");
        return;
    }

    const relayerWallet = new ethers.Wallet(privateKey, provider);

    const WRAPUP_ADDRESS = "0xd51BE7C7DE763eA4355D7092e8B9ab3401DC6124";
    const AUTO_CLAIMER_ADDRESS = "0x5D03F14c26AE3857bb0A84418Cbdb2225636E9b2";

    const wrapUpABI = ["event PointsAwarded(address indexed user, uint256 pointsEarned, uint256 totalPoints)"];
    const autoClaimerABI = ["function executeAutoClaim(address user) external"];

    const wrapUpContract = new ethers.Contract(WRAPUP_ADDRESS, wrapUpABI, provider);
    const autoClaimerContract = new ethers.Contract(AUTO_CLAIMER_ADDRESS, autoClaimerABI, relayerWallet);

    console.log("🟢 Somnia WebSocket Connected. Listening for PointsAwarded events...");

    wrapUpContract.on("PointsAwarded", async (user, pointsEarned, totalPoints) => {
        console.log(`⚡ Event Detected! User ${user} now has ${totalPoints} points.`);
        
        if (totalPoints % 100 === 0 || totalPoints >= 100) {
            console.log(`🚀 Threshold reached for ${user}. Triggering Reactive Auto-Airdrop...`);
            try {
                const tx = await autoClaimerContract.executeAutoClaim(user);
                console.log(`⏳ Airdrop transaction sent. Waiting for confirmation... Hash: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ Airdrop successful!`);
            } catch (error) {
                console.log("❌ Airdrop failed or already claimed:", error.shortMessage || error.message);
            }
        }
    });
}