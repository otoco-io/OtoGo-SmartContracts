const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const LaunchPoolSource = artifacts.require("LaunchPool");
const LaunchCurveSource = artifacts.require("LaunchCurveExponential");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Stake Tests', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.poolSource = await LaunchPoolSource.deployed();
    this.curveSource = await LaunchCurveSource.deployed();
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 18);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000','ether'), 18);
  });

  it('Deploy a new launch pool', async function () {

    const poolAddress = await this.factory.createLaunchPool(
      [this.token.address],
      [
      web3.utils.toWei('100'),
      web3.utils.toWei('5000000'),
      0,
      parseInt(Date.now()*0.001) + 1000,
      10,
      1000,
      web3.utils.toWei('1','ether'),
      web3.utils.toWei('5000000'),
      ],
      'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
      this.shares.address,
      0
    )

    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    expect(await this.pool.metadata()).to.equal("QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra");
  });

  it ('Update Pool metadata', async function () {
    const receipt = await this.pool.updateMetadata("QmZuQMs");
    expect(receipt.logs[0].args.newHash).to.equal("QmZuQMs");
    expect(await this.pool.metadata()).to.equal("QmZuQMs");
  });

  it('Try re-initialize Pool from sponsor', async function () {
    try { 
      await this.factory.initialize(this.poolSource.address, this.curveSource.address, {from:accounts[1]})
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Initializable: contract is already initialized');
    }
  })

  it ('Stake launch pool', async function () {
    expect((await this.pool.stage()).toString()).to.be.equals('1');
    await this.token.transfer(accounts[1], web3.utils.toWei('2','ether'));
    await this.token.approve(this.pool.address, (web3.utils.toWei('2','ether')), {from:accounts[1]});
    await this.pool.stake(this.token.address, (web3.utils.toWei('1','ether')), {from:accounts[1]});
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
    expect(balance.toString()).to.be.equals(web3.utils.toWei('1','ether'));
  });

  it ('Unstake launch pool', async function () {
    await this.pool.unstake(0, {from:accounts[1]});
    var stakes = await this.pool.stakesOf(accounts[1]);
    expect(stakes.length).to.be.equals(1);
    balance = await this.token.balanceOf(accounts[1]);
    expect(balance.toString()).to.be.equals(web3.utils.toWei('2','ether'));
    stakes = await this.pool.stakesDetailedOf(accounts[0]);
    stakes.forEach(e => {
      console.log(e.toString())
    });
  })

})
