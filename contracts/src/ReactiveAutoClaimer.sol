// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWrapUp {
    function getUserPoints(address _user) external view returns (uint256);
}
interface IWUPToken {
    function reactiveMint(address to, uint256 amount) external;
}

contract ReactiveAutoClaimer {
    IWrapUp public wrapUp;
    IWUPToken public wupToken;
    uint256 public constant POINTS_THRESHOLD = 100;
    uint256 public constant REWARD_AMOUNT = 1000 * 10**18;
    
    mapping(address => uint256) public lastClaimedPoints;
    address public somniaRelayer; // The authorized wallet executing the reactive transactions

    event ReactiveAirdropExecuted(address indexed user, uint256 tokenAmount);

    constructor(address _wrapUp, address _wupToken, address _somniaRelayer) {
        wrapUp = IWrapUp(_wrapUp);
        wupToken = IWUPToken(_wupToken);
        somniaRelayer = _somniaRelayer;
    }

    // This is called AUTOMATICALLY by the Somnia Reactivity stream, not by the user!
    function executeAutoClaim(address user) external {
        require(msg.sender == somniaRelayer, "Only Somnia Relayer");
        
        uint256 currentPoints = wrapUp.getUserPoints(user);
        uint256 claimableBatches = (currentPoints - lastClaimedPoints[user]) / POINTS_THRESHOLD;
        
        require(claimableBatches > 0, "Threshold not met");

        lastClaimedPoints[user] += (claimableBatches * POINTS_THRESHOLD);
        uint256 totalMint = claimableBatches * REWARD_AMOUNT;
        
        wupToken.reactiveMint(user, totalMint);
        emit ReactiveAirdropExecuted(user, totalMint);
    }
}