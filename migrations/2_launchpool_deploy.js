const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const web3 = require('web3');

module.exports = async function (deployer, network) {
  await deployer.deploy(LaunchPool);
  const poolInstance = await LaunchPool.deployed();
  await deployProxy(PoolFactory, [poolInstance.address], { deployer });
  if (network == 'development'){
    await deployer.deploy(LaunchToken, 'Test DAI', 'DAI', (10*(10**18)).toString());
  }
};
