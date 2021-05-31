const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const LaunchCurve = artifacts.require("PoolFactory");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Stake tests that should fail', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
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
      parseInt(Date.now()*0.001) + 10,
      10,
      10000,
      web3.utils.toWei('1','ether'),
      web3.utils.toWei('50')
      ],
      'QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1',
      this.shares.address,
      0
    )
    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    expect(await this.pool.metadata()).to.equal("QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1");
  });

  it ('Try to stake without token balance', async function () {
    await this.token.transfer(accounts[1], web3.utils.toWei('2','ether'));
    var balance = await this.token.balanceOf(accounts[2]);
    expect(balance.toString()).to.be.equals("0");
    try {
      await this.pool.stake(this.token.address, web3.utils.toWei('1','ether'), {from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('ERC20: transfer amount exceeds balance');
    }
  });

  it ('Try to stake without amount aproval', async function () {
    await this.token.transfer(accounts[2], web3.utils.toWei('2','ether'));
    var balance = await this.token.balanceOf(accounts[2]);
    expect(balance.toString()).to.be.equals(web3.utils.toWei('2','ether'));
    try { 
      await this.pool.stake(this.token.address, web3.utils.toWei('1','ether'), {from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('ERC20: transfer amount exceeds allowance');
    }
  });

  it ('Stake and try to remove a stake that not exists', async function () {
    await this.token.approve(this.pool.address, web3.utils.toWei('2','ether'), {from:accounts[2]});
    await this.pool.stake(this.token.address, web3.utils.toWei('1','ether'), {from:accounts[2]});
    try { 
      await this.pool.unstake(2, {from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Stake index out of bounds');
    }
  });

  it ('Try to stake more than clamped amount', async function () {
    await this.token.approve(this.pool.address, web3.utils.toWei('200','ether'), {from:accounts[0]});
    try { 
      await this.pool.stake(this.token.address, web3.utils.toWei('100','ether'), {from:accounts[0]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Stake maximum amount exceeded');
    }
  });

  it ('Try to stake below minimum amount allowed', async function () {
    await this.token.approve(this.pool.address, 1000, {from:accounts[2]});
    try { 
      await this.pool.stake(this.token.address, 1000, {from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Stake below minimum amount');
    }
  });

  it ('Try to remove stake twice', async function () {
    await this.pool.unstake(0, {from:accounts[2]});
    try { 
      await this.pool.unstake(0, {from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Stake already unstaked');
    }
  });

  it ('Try extend end timestamp more than 1 year', async function () {
    try { 
      await this.pool.extendEndTimestamp(50000000000);
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Extensions must be small than 1 year');
    }
  });

  it ('Wait 10 than delay launch pool', async function () {
    await wait();
    await this.pool.extendEndTimestamp(5);
    this.endTimestamp += 5;
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('1');
  });

  it ('Should trigger error due to not reach minimum stake', async function () {
    try { 
      await wait();
      await this.pool.lock();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('LaunchPool not reached minimum stake');
    }
  });

})

function wait() {
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
}