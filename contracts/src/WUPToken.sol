// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WUPToken is ERC20, Ownable {
    address public reactiveClaimer;

    constructor(address initialOwner) ERC20("WrapUp Token", "WUP") Ownable(initialOwner) {}

    function setReactiveClaimer(address _claimer) external onlyOwner {
        reactiveClaimer = _claimer;
    }

    // Only the automated reactive contract can mint
    function reactiveMint(address to, uint256 amount) external {
        require(msg.sender == reactiveClaimer, "Only Reactivity Engine");
        _mint(to, amount);
    }
}