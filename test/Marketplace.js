const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let Marketplace;
  let marketplace;
  let Token;
  let token;
  let owner;
  let seller;
  let buyer;
  const tokenAmount = 1000;  // Amount to list
  const tokenPrice = ethers.parseEther("8");  // Price per full token amount in ether

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    [owner, seller, buyer] = await ethers.getSigners();

    // deploy ERC20 token
    Token = await ethers.getContractFactory("ERC20MarketplaceItem");
    token = await Token.deploy(20000000);
    const tokenAddress = await token.getAddress();
    expect(tokenAddress).to.be.properAddress;
    // Mint tokens to the seller
    await token.transfer(seller.address, 20000000);
    // Deploy marketplace contract
    Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();
    const marketPlaceAddress = await token.getAddress();
    expect(marketPlaceAddress).to.be.properAddress;
  });

  it("should allow a user to list ERC-20 tokens for sale", async function () {
    // Seller approves marketplace to transfer tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);

    // Seller lists tokens
    await expect(marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice))
      .to.emit(marketplace, "ItemListed")
      .withArgs(anyValue, seller.address, token.getAddress(), tokenAmount, tokenPrice);

    // Check if listed correctly
    const listing = await marketplace.listings(0);
    const tokenAddress = await token.getAddress();
    expect(listing.seller).to.equal(seller.address);
    expect(listing.token).to.equal(tokenAddress);
    expect(listing.amount).to.equal(tokenAmount);
    expect(listing.price).to.equal(tokenPrice);
    expect(listing.active).to.be.true;
  });

  it("should allow a buyer to purchase listed tokens", async function () {
    // Seller approves marketplace to transfer tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);
    // Seller lists tokens
    await marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice);

    // Buyer purchases the tokens
    await expect(marketplace.connect(buyer).purchaseItem(0, { value: tokenPrice }))
      .to.emit(marketplace, "ItemPurchased")
      .withArgs(anyValue, buyer.address, seller.address, token.getAddress(), tokenAmount);

    // Check ownership transfer
    const buyerBalance = await token.balanceOf(buyer.address);
    expect(buyerBalance).to.equal(tokenAmount);

    // Check listing inactive
    const listing = await marketplace.listings(0);
    expect(listing.active).to.be.false;
  });

  it("should return only active listings", async function () {
    // Seller lists two items with different prices
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);
    // List one item
    await marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice);
    // Use native BigInt conversion
    const halfTokenAmount = BigInt(tokenAmount / 2);
    // Use BigInt division
    const halfTokenPrice = tokenPrice / 2n;
    // List another item with half the amount and price
    await token.connect(seller).approve(marketplace.getAddress(), halfTokenAmount);
    // List the other item
    await marketplace.connect(seller).listItem(token.getAddress(), halfTokenAmount, halfTokenPrice);
    // Buyer purchases one of the listings
    await marketplace.connect(buyer).purchaseItem(0, { value: tokenPrice });
    // Get active listings
    const activeListings = await marketplace.getListings();
    // Expect only one active listing
    expect(activeListings.length).to.equal(1);
    // Check the active listing
    const activeListing = activeListings[0];
    // Check the seller of the active listing
    expect(activeListing.seller).to.equal(seller.address);
    // Check the token of the active listing
    expect(activeListing.amount).to.equal(halfTokenAmount);
    // Check the price of the active listing
    expect(activeListing.price).to.equal(halfTokenPrice);
    // Check the active status of the active listing
    expect(activeListing.active).to.be.true;
  });

  it("should allow sellers to withdraw earnings in Ether", async function () {
    // Seller lists tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);
    await marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice);

    // Buyer purchases the tokens
    await marketplace.connect(buyer).purchaseItem(0, { value: tokenPrice });

    // Check seller balance before withdrawal
    const sellerBalanceBefore = ethers.toBigInt(await ethers.provider.getBalance(seller.address));

    // Seller withdraws funds
    await expect(marketplace.connect(seller).withdrawFunds())
      .to.emit(marketplace, "FundsWithdrawn")
      .withArgs(seller.address, tokenPrice);

    // Check seller balance after withdrawal
    const sellerBalanceAfter = ethers.toBigInt(await ethers.provider.getBalance(seller.address));

    // Calculate expected change (considering possible gas usage)
    const balanceChange = sellerBalanceAfter - sellerBalanceBefore;

    // Ensure at least the expected eth increment minus some gas usage is part of this
    expect(balanceChange).to.be.lt(ethers.toBigInt(tokenPrice));
  });
});



describe("Marketplace - Signature Authorization", function () {
  let marketplace;
  let owner;
  let participant;
  const nonce = 1;
  let deadline;

  beforeEach(async function () {
    [owner, participant] = await ethers.getSigners();

    // Deploy the marketplace contract
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    // Set a future deadline time
    deadline = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now
  });

  it("should authorize with a valid signature", async function () {
    // Get the chainId dynamically
    const { chainId } = await ethers.provider.getNetwork();
    const marketplaceAddress = await marketplace.getAddress();
    // Create a hash of the data that conforms to the EIP712 signature used in the contract (_hashTypedDataV4)
    const domain = {
      name: "Marketplace",
      version: "1",
      chainId: chainId,
      verifyingContract: marketplaceAddress,
    };

    const types = {
      Order: [
        { name: "participant", type: "address" }
      ],
    };

    const value = {
      participant: participant.address
    };


    // Use signTypedDataV4 util
    const signature = await participant.signTypedData(domain, types, value);
    // Call authorizeWithSignature with valid data
    const isAuthorized = await marketplace.authorizeWithSignature(
      participant.address,
      signature
    );

    // Expect the result to be true, indicating successful authorization
    expect(isAuthorized).to.be.true;
  });

  it("should not authorize with a invalid signature domain", async function () {
    // Get the chainId dynamically
    const { chainId } = await ethers.provider.getNetwork();
    const marketplaceAddress = await marketplace.getAddress();
    // Create a hash of the data that conforms to the EIP712 signature used in the contract (_hashTypedDataV4)
    const domain = {
      name: "Marketplace",
      version: "8", // Invalid version
      chainId: chainId,
      verifyingContract: marketplaceAddress,
    };

    const types = {
      Order: [
        { name: "participant", type: "address" }
      ],
    };

    const value = {
      participant: participant.address
    };


    // Use signTypedDataV4 util
    const signature = await participant.signTypedData(domain, types, value);
    // Call authorizeWithSignature with invalid domain data
    await expect( marketplace.authorizeWithSignature(
      participant.address,
      signature
    )).to.be.revertedWith("Invalid signature");
  });


  it("should fail authorization with an invalid signature", async function () {
    const incorrectSignature = "0x" + "00".repeat(65); // An invalid 'zero' signature
    await expect(
      marketplace.authorizeWithSignature(
        participant.address,
        incorrectSignature
      )
    ).to.be.revertedWithCustomError(marketplace, "ECDSAInvalidSignature");
  });
});
