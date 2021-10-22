const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const PoolFactory = artifacts.require("PoolFactory");
const PoolFactoryV2 = artifacts.require("PoolFactoryV2");

module.exports = async function (deployer, network) {
  const existing = await PoolFactory.deployed();
  const instance = await upgradeProxy(existing.address, PoolFactoryV2, { deployer });
  console.log("Upgraded", instance.address);
};
