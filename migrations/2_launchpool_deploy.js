const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const web3 = require('web3');

module.exports = async function (deployer) {
  await deployer.deploy(LaunchToken, 'Test DAI', 'DAI', 1000000);
  const tokenAddress = await LaunchToken.deployed();
  await deployer.deploy(LaunchPool,
    [tokenAddress.address],
    [100, 500000, parseInt(Date.now()*0.001) + 2, parseInt(Date.now()*0.001) + 1000],
    'Test Pool',
    'QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1',
  );
};
