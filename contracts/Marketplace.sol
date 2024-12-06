// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Marketplace is Ownable, EIP712 {
    using ECDSA for bytes32;

    struct Listing {
        uint256 id; // Unique identifier for each listing
        address seller; // Address of the seller
        address token; // Address of the ERC20 token being sold
        uint256 amount; // Amount of the token being listed
        uint256 price; // Price of the token in wei
        bool active; // Indicates if the listing is still active
    }

    // Mapping from listing ID to Listing details
    mapping(uint256 => Listing) public listings;
    uint256 public listingCount; // Counter to track total number of listings
    mapping(address => uint256) public sellerEarnings; // Tracks the earnings of each seller

    // Event emitted when a new item is listed
    event ItemListed(uint256 indexed listingId, address indexed seller, address token, uint256 amount, uint256 price);
    // Event emitted when an item is purchased
    event ItemPurchased(uint256 indexed listingId, address indexed buyer, address seller, address token, uint256 amount);
    // Event emitted when a seller withdraws their funds
    event FundsWithdrawn(address indexed seller, uint256 amount);

    constructor() EIP712("Marketplace", "1") Ownable(msg.sender) {
        // Constructor initializes the EIP712 domain
    }

    function listItem(address token, uint256 amount, uint256 price, bytes memory signature) external {
        // Verify the seller's signature
        require(_verify(msg.sender, signature), "Invalid signature");
        // Transfer tokens from the seller to the contract
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        // Store the listing details with a unique ID
        listings[listingCount] = Listing(listingCount, msg.sender, token, amount, price, true);
        // Emit event after successfully listing the item
        emit ItemListed(listingCount, msg.sender, token, amount, price);
        // Increment the listing counter for the next listing
        listingCount++;
    }

    function purchaseItem(uint256 listingId, bytes memory signature) external payable {
        // Verify the buyer's signature
        require(_verify(msg.sender, signature), "Invalid signature");
        // Check if the listing exists by ensuring it's neither zeroed out nor set to default values
        require(listingExists(listingId), "Listing does not exist");
        // Retrieve the listing from storage
        Listing storage listing = listings[listingId];
        // Ensure the listing is still active
        require(listing.active, "Listing inactive");
        // Check if the sent value matches the listing price
        require(msg.value == listing.price, "Incorrect Ether amount sent");
        // Check if the sent value covers the listing price
        require(msg.value >= listing.price, "Insufficient Ether sent");

        // Mark the listing as inactive once purchased
        listing.active = false;

        // Transfer the tokens from the contract to the buyer
        require(IERC20(listing.token).transfer(msg.sender, listing.amount), "Token transfer failed");

        // Credit the seller's earnings
        sellerEarnings[listing.seller] += listing.price;

        // Emit event for the successful purchase
        emit ItemPurchased(listingId, msg.sender, listing.seller, listing.token, listing.amount);
    }

    // Function to verify the existence of a listing
    function listingExists(uint256 listingId) internal view returns (bool) {
        // Example check based on initialized fields
        Listing storage listing = listings[listingId];
        return listing.price != 0 || listing.amount != 0; // Adjust according to actual struct default checks
    }

    function withdrawFunds(bytes memory signature) external {
        // Verify the seller's signature
        require(_verify(msg.sender, signature), "Invalid signature");
        // Get the amount available for withdrawal
        uint256 amount = sellerEarnings[msg.sender];
        // Ensure there are funds to withdraw
        require(amount > 0, "No funds to withdraw");
        // Reset the seller's earnings to zero
        sellerEarnings[msg.sender] = 0;
        // Transfer the funds to the seller
        payable(msg.sender).transfer(amount);
        // Emit event after funds are withdrawn
        emit FundsWithdrawn(msg.sender, amount);
    }

    function _verify(address participant, bytes memory signature) internal view returns (bool) {
        // Generate a hash of the data using EIP712 encoding
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(keccak256("Order(address participant)"), participant))
        );
        // Verify that the recovered signature matches the participant's address
        return digest.recover(signature) == participant;
    }

    function authorizeWithSignature(address participant, bytes memory signature) external view returns (bool) {
        // Ensure the participant's signature is valid
        require(_verify(participant, signature), "Invalid signature");
        return true;
    }

    function getListings() external view returns (Listing[] memory) {
        // If listingCount is zero, return an empty array immediately
        if (listingCount == 0) {
            return new Listing[](0);
        }
        // Initialize an array to store active listings
        Listing[] memory activeListings = new Listing[](listingCount);
        uint256 count = 0;
        // Loop through each listing and gather active ones
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].active) {
                activeListings[count] = listings[i];
                count++;
            }
        }
        // Create a result array of exact size needed
        Listing[] memory result = new Listing[](count);
        // Copy active listings to the result array
        for (uint256 j = 0; j < count; j++) {
            result[j] = activeListings[j];
        }
        // Return the array of active listings
        return result;
    }
}
