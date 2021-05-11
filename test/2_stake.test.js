const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Stake Tests', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.token = await LaunchToken.deployed();
  });
 
  it('Deploy a new launch pool', async function () {
    const poolAddress = await this.factory.createLaunchPool(
      [this.token.address],
      [web3.utils.toWei('100','ether'),
      web3.utils.toWei('5000000','ether'),
      parseInt(Date.now()*0.001) + 2,
      parseInt(Date.now()*0.001) + 1000],
      'Test Pool',
      'QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1',
    )
    // console.log(JSON.stringify(poolAddress));

    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    expect(await this.pool.name()).to.equal("Test Pool");
    expect(await this.pool.metadata()).to.equal("QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1");
  });
})
