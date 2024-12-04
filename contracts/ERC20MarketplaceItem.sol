// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20MarketplaceItem is ERC20 {
    constructor(uint256 initialSupply) ERC20("MarketplaceItemToken", "MKI") {
        _mint(msg.sender, initialSupply);
    }
}
