const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const LaunchPool = artifacts.require("LaunchPool");
const LaunchCurve = artifacts.require("LaunchCurveExponential");
const PoolFactory = artifacts.require("PoolFactory");

module.exports = async function (deployer, network) {
  await deployer.deploy(LaunchPool);
  await deployer.deploy(LaunchCurve);
  const curveInstance = await LaunchCurve.deployed();
  const poolInstance = await LaunchPool.deployed();
  await deployProxy(PoolFactory, [poolInstance.address, curveInstance.address], { deployer });
};
