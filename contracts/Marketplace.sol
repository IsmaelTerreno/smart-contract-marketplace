// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Marketplace is Ownable, EIP712 {
    // Importing ECDSA library for signature verification
    using ECDSA for bytes32;

    // Struct to store listing details
    struct Listing {
        address seller;
        address token;
        uint256 amount;
        uint256 price;
        bool active;
    }
    // Mapping to store listings
    mapping(uint256 => Listing) public listings;
    // Variable to store listing count
    uint256 public listingCount;
    // Mapping to store seller earnings
    mapping(address => uint256) public sellerEarnings;
    // Event when an item is listed
    event ItemListed(uint256 indexed listingId, address indexed seller, address token, uint256 amount, uint256 price);
    // Event when an item is purchased
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, address seller, address token, uint256 amount);
    // Event when funds are withdrawn
    event FundsWithdrawn(address indexed seller, uint256 amount);

    // Constructor with name Marketplace and version 1
    constructor() EIP712("Marketplace", "1") Ownable(msg.sender) {}

    // Function to list an item from the marketplace
    function listItem(address token, uint256 amount, uint256 price) external {
        // Transfer tokens from the seller to the contract
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        // Store the listing details
        listings[listingCount] = Listing(msg.sender, token, amount, price, true);
        // Emit the ItemListed event
        emit ItemListed(listingCount, msg.sender, token, amount, price);
        // Increment the listing count
        listingCount++;
    }

    // Function to purchase an item from the marketplace
    function purchaseItem(uint256 listingId) external payable {
        // Get the listing details
        Listing storage listing = listings[listingId];
        // Check if the listing is active
        require(listing.active, "Listing inactive");
        // Check if the buyer has sent enough ether
        require(msg.value >= listing.price, "Insufficient Ether sent");
        // Mark the listing as inactive to prevent reentrancy
        listing.active = false;
        // Transfer the tokens to the buyer
        require(IERC20(listing.token).transfer(msg.sender, listing.amount), "Token transfer failed");
        // Update seller earnings instead of directly transferring funds
        sellerEarnings[listing.seller] += listing.price;
        // Emit the ItemPurchased event to log the purchase
        emit ItemPurchased(listingId, msg.sender, listing.seller, listing.token, listing.amount);
    }

    // Function to withdraw funds from the contract for the seller
    function withdrawFunds() external {
        // Get the amount to withdraw
        uint256 amount = sellerEarnings[msg.sender];
        // Check if the seller has earnings
        require(amount > 0, "No funds to withdraw");
        // Zero out the seller earnings before transferring to prevent reentrancy
        sellerEarnings[msg.sender] = 0;
        // Transfer the funds to the seller
        payable(msg.sender).transfer(amount);
        // Emit the FundsWithdrawn event to log the withdrawal
        emit FundsWithdrawn(msg.sender, amount);
    }

    // Function to verify the signature
    function _verify(
        address participant,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) internal view returns (bool) {
        // Hash the data using EIP712
        bytes32 digest = _hashTypedDataV4(
            // Create a hash of the order data
            keccak256(
                // Encode the order data
                abi.encode(
                    keccak256("Order(address participant,uint256 nonce,uint256 deadline)"),
                    participant,
                    nonce,
                    deadline
                )
            )
        );
        // Recover the signer from the signature
        return digest.recover(signature) == participant;
    }

    // Function to authorize with a signature
    function authorizeWithSignature(
        address participant,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) external view returns (bool) {
        // Check if the deadline has not passed
        require(block.timestamp <= deadline, "Signature expired");
        // Verify the signature
        require(_verify(participant, nonce, deadline, signature), "Invalid signature");
        // Return true if the signature is valid
        return true;
    }
}
