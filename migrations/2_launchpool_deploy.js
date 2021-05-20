const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const LaunchCurve = artifacts.require("LaunchCurveExponential");
const web3 = require('web3');

module.exports = async function (deployer, network) {
  await deployer.deploy(LaunchPool);
  await deployer.deploy(LaunchCurve);
  const curveInstance = await LaunchCurve.deployed();
  const poolInstance = await LaunchPool.deployed();
  await deployProxy(PoolFactory, [poolInstance.address, curveInstance.address], { deployer });
  if (network == 'development'){
    await deployer.deploy(LaunchToken, 'Test DAI', 'DAI', web3.utils.toWei('100000000','ether'));
  }
};
