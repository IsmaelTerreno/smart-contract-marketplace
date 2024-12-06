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

  const getDomain = async () => {
    const { chainId } = await ethers.provider.getNetwork();
    const marketplaceAddress = await marketplace.getAddress();
    return {
      name: "Marketplace",
      version: "1",
      chainId: chainId,
      verifyingContract: marketplaceAddress,
    };
  }

  const createSignature = async (participant, domain) => {
    // Types of data to sign
    const types = {
      Order: [
        { name: "participant", type: "address" }
      ],
    };
    // Value to sign
    const value = {
      participant: participant.address,
    };
    // Use signTypedDataV4 util to the sign the data types and value
    return  await participant.signTypedData(domain, types, value);
  }

  it("should allow a user to list ERC-20 tokens for sale", async function () {
    // Seller approves marketplace to transfer tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);

    // Create the domain and signature for the seller
    const domainSeller = await getDomain();
    const signatureSeller = await createSignature(seller, domainSeller);

    // Seller lists tokens with the signature
    await expect(marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice, signatureSeller))
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

    // Create the domain and signature for the seller
    const domainSeller = await getDomain();
    const signatureSeller = await createSignature(seller, domainSeller);

    // Seller lists tokens with the signature
    await expect(marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice, signatureSeller))

    // Create the domain and signature for the buyer
    const domain = await getDomain();
    const signature = await createSignature(buyer, domain);

    // Buyer purchases the tokens with signature
    await expect(marketplace.connect(buyer).purchaseItem(0, signature, { value: tokenPrice }))
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
    // Seller approves marketplace to transfer tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);

    // Create the domain and signature for the seller
    const domainSeller = await getDomain();
    const signatureSeller = await createSignature(seller, domainSeller);

    // Seller lists the first item with a valid signature
    await expect(marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice, signatureSeller))

    // Calculate half the token amount and price for the second item
    const halfTokenAmount = BigInt(tokenAmount / 2);
    const halfTokenPrice = tokenPrice / 2n;

    // Approve and list a second item with half the amount and price
    await token.connect(seller).approve(marketplace.getAddress(), halfTokenAmount);
    // Seller lists the second item with a valid signature
    await marketplace.connect(seller).listItem(token.getAddress(), halfTokenAmount, halfTokenPrice, signatureSeller);

    // Create the domain and signature for the buyer
    const domain = await getDomain();
    const signature = await createSignature(buyer, domain);

    // Buyer purchases the first listing using a valid signature
    await marketplace.connect(buyer).purchaseItem(0, signature, { value: tokenPrice });

    // Get active listings
    const activeListings = await marketplace.getListings();

    // Expect only one active listing remains
    expect(activeListings.length).to.equal(1);

    // Verify details of the active listing
    const activeListing = activeListings[0];
    expect(activeListing.seller).to.equal(seller.address);
    expect(activeListing.amount).to.equal(halfTokenAmount);
    expect(activeListing.price).to.equal(halfTokenPrice);
    expect(activeListing.active).to.be.true;
  });

  it("should allow sellers to withdraw earnings in Ether", async function () {
    // Seller approves marketplace to transfer tokens
    await token.connect(seller).approve(marketplace.getAddress(), tokenAmount);

    // Create the domain and signature for the seller
    const domainSeller = await getDomain();
    const signatureSeller = await createSignature(seller, domainSeller);

    // Seller lists tokens with the signature
    await expect(marketplace.connect(seller).listItem(token.getAddress(), tokenAmount, tokenPrice, signatureSeller))

    // Create the domain and signature for the buyer
    const domain = await getDomain();
    const buyerSignature = await createSignature(buyer, domain);

    // Buyer purchases the tokens with a valid signature
    await marketplace.connect(buyer).purchaseItem(0, buyerSignature, { value: tokenPrice });

    // Check seller balance before withdrawal
    const sellerBalanceBefore = ethers.toBigInt(await ethers.provider.getBalance(seller.address));

    // Create a signature for the seller to withdraw funds
    const sellerSignature = await createSignature(seller, domain);

    // Seller withdraws funds with a valid signature
    await expect(marketplace.connect(seller).withdrawFunds(sellerSignature))
      .to.emit(marketplace, "FundsWithdrawn")
      .withArgs(seller.address, anyValue);

    // Check seller balance after withdrawal
    const sellerBalanceAfter = ethers.toBigInt(await ethers.provider.getBalance(seller.address));

    // Calculate expected balance change (considering possible gas usage)
    const balanceChange = sellerBalanceAfter - sellerBalanceBefore;

    // Ensure at least the expected eth increment minus some gas usage is part of this
    expect(balanceChange).to.be.closeTo(ethers.toBigInt(tokenPrice), ethers.toBigInt(ethers.parseEther("0.01"))); // Allow some margin for gas
  });

  it("should authorize with a valid signature from owner", async function () {
    // Create a hash of the data that conforms to the EIP712 signature used in the contract (_hashTypedDataV4)
    const domain = await getDomain();
    // Use signTypedDataV4 util
    const signature = await createSignature(owner,domain );
    // Call authorizeWithSignature with valid data
    const isAuthorized = await marketplace.authorizeWithSignature(
      owner.address,
      signature
    );
    // Expect the result to be true, indicating successful authorization
    expect(isAuthorized).to.be.true;
  });

  it("should authorize with a valid signature from buyer", async function () {
    // Create a hash of the data that conforms to the EIP712 signature used in the contract (_hashTypedDataV4)
    const domain = await getDomain();
    // Use signTypedDataV4 util
    const signature = await createSignature(buyer,domain );
    // Call authorizeWithSignature with valid data
    const isAuthorized = await marketplace.authorizeWithSignature(
      buyer.address,
      signature
    );
    // Expect the result to be true, indicating successful authorization
    expect(isAuthorized).to.be.true;
  });

  it("should not authorize with a invalid signature domain", async function () {
    // Create a hash of the data that conforms to the EIP712 signature used in the contract (_hashTypedDataV4)
    const domain = await getDomain();
    domain.version = "8"; // Change the domain version to invalidate the signature
    // Use signTypedDataV4 util
    const signature = await createSignature(owner,domain );
    // Call authorizeWithSignature with invalid domain data
    await expect( marketplace.authorizeWithSignature(
      owner.address,
      signature
    )).to.be.revertedWith("Invalid signature");
  });


  it("should fail authorization with an invalid signature", async function () {
    const incorrectSignature = "0x" + "00".repeat(65); // An invalid 'zero' signature
    await expect(
      marketplace.authorizeWithSignature(
        owner.address,
        incorrectSignature
      )
    ).to.be.revertedWithCustomError(marketplace, "ECDSAInvalidSignature");
  });
});

