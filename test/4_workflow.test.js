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
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 18);
    this.token2 = await LaunchToken.new('Test USDT', 'USDT', web3.utils.toWei('100000000','mwei'), 6);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000','ether'), 18);
  });

  it('Testing pool lifetime, stake, unstake, withdraw.', async function () {

    const poolAddress = await this.factory.createLaunchPool(
      [this.token.address, this.token2.address],
      [
      web3.utils.toWei('100','ether'),
      web3.utils.toWei('2000000','ether'),
      0,
      parseInt(Date.now()*0.001) + 2,
      10,
      100
      ],
      'QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1',
      this.shares.address,
      0
    )

    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    await this.shares.transfer(this.pool.address, web3.utils.toWei('2000000','ether'));
    expect(await this.pool.metadata()).to.equal("QmXE83PeG8xq8sT6GdeoYaAVVozAcJ4dN7xVCLuehDxVb1");
  });

  it('Change stage to staking', async function () {
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('1');
  })

  it('Distribute tokens for accounts to stake', async function() {
    // Send tokens 
    await this.token.transfer(accounts[2], web3.utils.toWei('1000000','ether'))
    await this.token.transfer(accounts[3], web3.utils.toWei('1000000','ether'))
    await this.token2.transfer(accounts[4], web3.utils.toWei('1000000','mwei'))
    await this.token2.transfer(accounts[5], web3.utils.toWei('1000000','mwei'))
    await this.token2.transfer(accounts[6], web3.utils.toWei('1000000','mwei'))
    // Approve pool to transfer tokens
    await this.token.approve(this.pool.address, web3.utils.toWei('1000000','ether'), {from:accounts[2]});
    await this.token.approve(this.pool.address, web3.utils.toWei('1000000','ether'), {from:accounts[3]});
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000','mwei'), {from:accounts[4]});
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000','mwei'), {from:accounts[5]});
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000','mwei'), {from:accounts[6]});
    let balance2 = await this.token.balanceOf(accounts[2]);
    let balance3 = await this.token.balanceOf(accounts[3]);
    let balance4 = await this.token2.balanceOf(accounts[4]);
    let balance5 = await this.token2.balanceOf(accounts[5]);
    let balance6 = await this.token2.balanceOf(accounts[6]);
    // Verify balances
    expect(balance2.toString()).to.equal(web3.utils.toWei('1000000','ether'));
    expect(balance3.toString()).to.equal(web3.utils.toWei('1000000','ether'));
    expect(balance4.toString()).to.equal(web3.utils.toWei('1000000','mwei'));
    expect(balance5.toString()).to.equal(web3.utils.toWei('1000000','mwei'));
    expect(balance6.toString()).to.equal(web3.utils.toWei('1000000','mwei'));
  });

  it ('Stake launch pool', async function () {
    await this.pool.stake(this.token.address, web3.utils.toWei('400000','ether'), {from:accounts[2]});
    await this.pool.stake(this.token.address, web3.utils.toWei('400000','ether'), {from:accounts[3]});
    await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[4]});
    await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[5]});
    await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[6]});
    var stakes = await this.pool.stakesList();
    expect(stakes).to.be.an('array');
    expect(stakes[0].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[1].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[2].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[3].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[4].toString()).to.be.equals(web3.utils.toWei('400000'));
  });

  it ('Wait 10 seconds before close pool', async function () {
    await wait();
    await this.pool.lock();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('3');
  });

  it ('Calculate stake shares', async function () {
    await this.pool.calculateSharesChunk();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('4');
  });

  it ('Distribute shares to the investors', async function () {
    await this.pool.distributeSharesChunk();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('5');
    let balance2 = await this.shares.balanceOf(accounts[2]);
    let balance3 = await this.shares.balanceOf(accounts[3]);
    let balance4 = await this.shares.balanceOf(accounts[4]);
    let balance5 = await this.shares.balanceOf(accounts[5]);
    let balance6 = await this.shares.balanceOf(accounts[6]);
    console.log('BALANCE 2',balance2.toString());
    console.log('BALANCE 3',balance3.toString());
    console.log('BALANCE 4',balance4.toString());
    console.log('BALANCE 5',balance5.toString());
    console.log('BALANCE 6',balance6.toString());
    expect(balance2.gt(balance3)).to.be.true;
    expect(balance3.gt(balance4)).to.be.true;
    expect(balance4.gt(balance5)).to.be.true;
    expect(balance5.gt(balance6)).to.be.true;
  });

  it ('Withdraw stakes from sponsor', async function () {
    let balanceBefore = await this.token.balanceOf(accounts[0]);
    await this.pool.withdrawStakes(this.token.address);
    let balanceAfter = await this.token.balanceOf(accounts[0]);
    expect(balanceBefore.lt(balanceAfter)).to.be.true;
    balanceBefore = await this.token2.balanceOf(accounts[0]);
    await this.pool.withdrawStakes(this.token2.address);
    balanceAfter = await this.token2.balanceOf(accounts[0]);
    expect(balanceBefore.lt(balanceAfter)).to.be.true;
  });
})

function wait() {
  return new Promise((resolve) => {
    setTimeout(resolve(), 50000);
  });
}