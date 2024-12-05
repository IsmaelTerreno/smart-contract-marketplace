// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MarketplaceModule", (m) => {
  const marketplace = m.contract("Marketplace", [], {});
  const ERC20MarketplaceItem = m.contract("ERC20MarketplaceItem", [20000000], {});
  return { marketplace, ERC20MarketplaceItem };
});
