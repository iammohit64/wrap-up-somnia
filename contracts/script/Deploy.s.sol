// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WrapUp.sol";
import "../src/WUPToken.sol";
import "../src/ReactiveAutoClaimer.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // EXPLICITLY set your actual wallet address here instead of msg.sender.
        // This guarantees your 0x4f5B... wallet is the owner of the token.
        address deployer = 0x4f5B0d937445d63346080FA209bA26C26366142B;

        // 1. Deploy WrapUp
        WrapUp wrapUp = new WrapUp();
        console.log("WrapUp deployed to:", address(wrapUp));

        // 2. Deploy WUPToken (Assigns ownership to your specific wallet)
        WUPToken wupToken = new WUPToken(deployer);
        console.log("WUPToken deployed to:", address(wupToken));

        // 3. Deploy ReactiveAutoClaimer 
        ReactiveAutoClaimer claimer = new ReactiveAutoClaimer(address(wrapUp), address(wupToken), deployer);
        console.log("ReactiveAutoClaimer deployed to:", address(claimer));

        // 4. Authorize the Auto-Claimer to mint tokens
        wupToken.setReactiveClaimer(address(claimer));
        console.log("Authorized ReactiveAutoClaimer to mint WUP tokens automatically");

        vm.stopBroadcast();
    }
}