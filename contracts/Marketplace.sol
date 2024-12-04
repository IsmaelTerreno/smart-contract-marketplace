// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Marketplace is Ownable, EIP712 {
    using ECDSA for bytes32;

    struct Listing {
        address seller;
        address token;
        uint256 amount;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;
    mapping(address => uint256) public sellerEarnings;

    event ItemListed(uint256 indexed listingId, address indexed seller, address token, uint256 amount, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, address seller, address token, uint256 amount);
    event FundsWithdrawn(address indexed seller, uint256 amount);

    constructor() EIP712("Marketplace", "1") Ownable(msg.sender) {}

    function listItem(address token, uint256 amount, uint256 price) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        listings[listingCount] = Listing(msg.sender, token, amount, price, true);
        emit ItemListed(listingCount, msg.sender, token, amount, price);

        listingCount++;
    }

    function purchaseItem(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];

        require(listing.active, "Listing inactive");
        require(msg.value >= listing.price, "Insufficient Ether sent");

        listing.active = false;
        require(IERC20(listing.token).transfer(msg.sender, listing.amount), "Token transfer failed");

        // Update seller earnings instead of directly transferring funds
        sellerEarnings[listing.seller] += listing.price;

        emit ItemPurchased(listingId, msg.sender, listing.seller, listing.token, listing.amount);
    }

    function withdrawFunds() external {
        uint256 amount = sellerEarnings[msg.sender];
        require(amount > 0, "No funds to withdraw");

        sellerEarnings[msg.sender] = 0; // Zero it out before transferring
        payable(msg.sender).transfer(amount);

        emit FundsWithdrawn(msg.sender, amount);
    }

    function _verify(
        address participant,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256("Order(address participant,uint256 nonce,uint256 deadline)"),
                    participant,
                    nonce,
                    deadline
                )
            )
        );
        return digest.recover(signature) == participant;
    }

    function authorizeWithSignature(
        address participant,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) external view returns (bool) {
        require(block.timestamp <= deadline, "Signature expired");
        require(_verify(participant, nonce, deadline, signature), "Invalid signature");
        return true;
    }
}
