const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Lifetime with Stake and Unstake, different decimals', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 18);
    this.token2 = await LaunchToken.new('Test USDT', 'USDT', web3.utils.toWei('100000000','mwei'), 6);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000','ether'), 18);
  });

  it('Deploy a new launch pool', async function () {

    const receipt = await this.factory.createLaunchPool(
      [this.token.address, this.token2.address],
      [
      web3.utils.toWei('100'),
      web3.utils.toWei('2000000'),
      0,
      parseInt(Date.now()*0.001) + 10,
      10,
      100,
      web3.utils.toWei('0.5'),
      web3.utils.toWei('2000000')
      ],
      'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
      this.shares.address,
      0,
      '0x0000000000000000000000000000000000000000'
    )

    expect(receipt.logs[0].args.metadata).to.equal('QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra');
    expect(receipt.logs[0].args.sponsor).to.equal(accounts[0]);
    this.pool = await LaunchPool.at(receipt.logs[0].args.pool);
    await this.shares.approve(this.pool.address, web3.utils.toWei('4000000','ether'));
    expect(await this.pool.metadata()).to.equal("QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra");
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
    let receipt;
    receipt = await this.pool.stake(this.token.address, web3.utils.toWei('400000','ether'), {from:accounts[2]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('0');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[2]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    receipt = await this.pool.stake(this.token.address, web3.utils.toWei('400000','ether'), {from:accounts[3]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('1');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[3]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    receipt = await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[4]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('2');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[4]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token2.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','mwei'));
    receipt = await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[5]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('3');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[5]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token2.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','mwei'));
    receipt = await this.pool.stake(this.token2.address, web3.utils.toWei('400000','mwei'), {from:accounts[6]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('4');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[6]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token2.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','mwei'));
    receipt = await this.pool.unstake(0, {from:accounts[3]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('1');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[3]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    receipt = await this.pool.unstake(0, {from:accounts[5]});
    expect(receipt.logs[0].args.index.toString()).to.be.equals('3');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[5]);
    expect(receipt.logs[0].args.token).to.be.equals(this.token2.address);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    var stakes = await this.pool.stakesList();
    expect(stakes).to.be.an('array');
    expect(stakes[0].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[1].toString()).to.be.equals(web3.utils.toWei('0'));
    expect(stakes[2].toString()).to.be.equals(web3.utils.toWei('400000'));
    expect(stakes[3].toString()).to.be.equals(web3.utils.toWei('0'));
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
    let receipt = await this.pool.distributeSharesChunk();
    expect(receipt.logs[0].args.index.toString()).to.be.equals('0');
    expect(receipt.logs[0].args.investor).to.be.equals(accounts[2]);
    expect(receipt.logs[0].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    expect(receipt.logs[0].args.shares.toString()).to.be.equals(web3.utils.toWei('800000','ether'));
    expect(receipt.logs[1].args.index.toString()).to.be.equals('2');
    expect(receipt.logs[1].args.investor).to.be.equals(accounts[4]);
    expect(receipt.logs[1].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    expect(receipt.logs[1].args.shares.toString()).to.be.equals('689655172413793103448275');
    expect(receipt.logs[2].args.index.toString()).to.be.equals('4');
    expect(receipt.logs[2].args.investor).to.be.equals(accounts[6]);
    expect(receipt.logs[2].args.amount.toString()).to.be.equals(web3.utils.toWei('400000','ether'));
    expect(receipt.logs[2].args.shares.toString()).to.be.equals('487804878048780487804878');
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
    expect(balance2.gt(balance4)).to.be.true;
    expect(balance4.gt(balance6)).to.be.true;
    expect(balance6.gt(balance3)).to.be.true;
    // LAST comparision is between unstaked
    expect(balance3.eq(balance5)).to.be.true;
    balance3 = await this.token.balanceOf(accounts[3]);
    balance5 = await this.token2.balanceOf(accounts[5]);
    expect(balance3.toString()).to.equal(web3.utils.toWei('1000000','ether'));
    expect(balance5.toString()).to.equal(web3.utils.toWei('1000000','mwei'));
  });


})

function wait() {
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
}