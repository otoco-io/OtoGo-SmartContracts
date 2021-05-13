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
      0,
      parseInt(Date.now()*0.001) + 1000],
      'Test Pool',
      'QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1',
    )
    // console.log(JSON.stringify(poolAddress));

    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    expect(await this.pool.name()).to.equal("Test Pool");
    expect(await this.pool.metadata()).to.equal("QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1");
  });

  it ('Stake launch pool', async function () {
    await this.pool.open();
    await this.token.transfer(accounts[1], (2*(10**18)).toString());
    await this.token.approve(this.pool.address, (2*(10**18)).toString(), {from:accounts[1]});
    await this.pool.stake(this.token.address, (1*(10**18)).toString(), {from:accounts[1]});
    var stakes = await this.pool.stakesOf(accounts[0]);
    expect(stakes).to.be.an('array');
    expect(stakes.length).to.be.equals(0);
    stakes = await this.pool.stakesOf(accounts[1]);
    expect(stakes).to.be.an('array');
    expect(stakes.length).to.be.equals(1);
    stakes = await this.pool.stakesDetailedOf(accounts[1]);
    stakes.forEach(e => {
      console.log(e.toString())
    });
    var balance = await this.token.balanceOf(accounts[1]);
    expect(balance.toString()).to.be.equals((1*(10**18)).toString());
  });

  it ('Unstake launch pool', async function () {
    await this.pool.unstake(0, {from:accounts[1]});
    var stakes = await this.pool.stakesOf(accounts[1]);
    expect(stakes.length).to.be.equals(1);
    balance = await this.token.balanceOf(accounts[1]);
    expect(balance.toString()).to.be.equals((2*(10**18)).toString());
    stakes = await this.pool.stakesDetailedOf(accounts[1]);
    stakes.forEach(e => {
      console.log(e.toString())
    });
  })

})
