const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Multiple stakes', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000', 'ether'), 18);
    this.token2 = await LaunchToken.new('Test USDT', 'USDT', web3.utils.toWei('100000000', 'mwei'), 6);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000', 'ether'), 18);
  });

  it('Deploy a new launch pool', async function () {

    const poolAddress = await this.factory.createLaunchPool(
      [this.token.address, this.token2.address],
      [
        web3.utils.toWei('100'),
        web3.utils.toWei('2000000'),
        0,
        parseInt(Date.now() * 0.001) + 10,
        10,
        100,
        web3.utils.toWei('1'),
        web3.utils.toWei('2000000')
      ],
      'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
      this.shares.address,
      0
    )

    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    console.log('LAUNCH POOL DEPLOYED:', this.pool.address);
    console.log('SHARES DEPLOYED:', this.shares.address);
    console.log('TOKEN DAI DEPLOYED:', this.token.address);
    console.log('TOKEN USDT DEPLOYED:', this.token2.address);
    await this.shares.approve(this.pool.address, web3.utils.toWei('2000000', 'ether'));
    expect(await this.pool.metadata()).to.equal("QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra");
  });

  it('Change stage to staking', async function () {
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('1');
  })

  it('Distribute tokens for accounts to stake', async function () {
    // Send tokens 
    await this.token.transfer(accounts[2], web3.utils.toWei('1000000', 'ether'))
    await this.token.transfer(accounts[3], web3.utils.toWei('1000000', 'ether'))
    await this.token2.transfer(accounts[4], web3.utils.toWei('1000000', 'mwei'))
    await this.token2.transfer(accounts[5], web3.utils.toWei('1000000', 'mwei'))
    await this.token2.transfer(accounts[6], web3.utils.toWei('1000000', 'mwei'))
    // Approve pool to transfer tokens
    await this.token.approve(this.pool.address, web3.utils.toWei('1000000', 'ether'), { from: accounts[2] });
    await this.token.approve(this.pool.address, web3.utils.toWei('1000000', 'ether'), { from: accounts[3] });
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000', 'mwei'), { from: accounts[4] });
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000', 'mwei'), { from: accounts[5] });
    await this.token2.approve(this.pool.address, web3.utils.toWei('1000000', 'mwei'), { from: accounts[6] });
    let balance2 = await this.token.balanceOf(accounts[2]);
    let balance3 = await this.token.balanceOf(accounts[3]);
    let balance4 = await this.token2.balanceOf(accounts[4]);
    let balance5 = await this.token2.balanceOf(accounts[5]);
    let balance6 = await this.token2.balanceOf(accounts[6]);
    // Verify balances
    expect(balance2.toString()).to.equal(web3.utils.toWei('1000000', 'ether'));
    expect(balance3.toString()).to.equal(web3.utils.toWei('1000000', 'ether'));
    expect(balance4.toString()).to.equal(web3.utils.toWei('1000000', 'mwei'));
    expect(balance5.toString()).to.equal(web3.utils.toWei('1000000', 'mwei'));
    expect(balance6.toString()).to.equal(web3.utils.toWei('1000000', 'mwei'));
  });

  it('Stake launch pool', async function () {
    for (let i = 0; i < 20; i++) {
      await this.pool.stake(this.token.address, web3.utils.toWei('4000', 'ether'), { from: accounts[2] });
      await this.pool.stake(this.token.address, web3.utils.toWei('4000', 'ether'), { from: accounts[3] });
      await this.pool.stake(this.token2.address, web3.utils.toWei('4000', 'mwei'), { from: accounts[4] });
      await this.pool.stake(this.token2.address, web3.utils.toWei('4000', 'mwei'), { from: accounts[5] });
      await this.pool.stake(this.token2.address, web3.utils.toWei('4000', 'mwei'), { from: accounts[6] });
    }
    var stakes = await this.pool.stakesList();
    expect(stakes).to.be.an('array');
    expect(stakes.length).to.be.equals(100);
    expect(stakes[0].toString()).to.be.equals(web3.utils.toWei('400'));
    expect(stakes[1].toString()).to.be.equals(web3.utils.toWei('400'));
    expect(stakes[2].toString()).to.be.equals(web3.utils.toWei('400'));
    expect(stakes[3].toString()).to.be.equals(web3.utils.toWei('400'));
    expect(stakes[4].toString()).to.be.equals(web3.utils.toWei('400'));
  });

  it('Sponsor tries to withdraw user stakes', async function () {
    try {
      await this.pool.withdrawStakes(this.token.address);
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Launch pool not finalized yet');
    }
  });

  it('Lock launch pool', async function () {
    await this.pool.lock();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('3');
  });

  it('Sponsor tries to withdraw user stakes', async function () {
    try {
      await this.pool.withdrawStakes(this.token.address);
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Launch pool not finalized yet');
    }
  });

  it('Calculate stake shares', async function () {
    let info = await this.pool.getGeneralInfos();
    let counter = 0;
    while (info[7].toString() == '3') {
      await this.pool.calculateSharesChunk({ gas: 1100000 });
      info = await this.pool.getGeneralInfos();
      counter++;
      console.log('Calculating...', counter);
    }
    expect(info[7].toString()).to.equal('4');
  });

  it('Distribute stake shares', async function () {
    let info = await this.pool.getGeneralInfos();
    let counter = 0;
    while (info[7].toString() == '4') {
      await this.pool.distributeSharesChunk({ gas: 1100000 });
      info = await this.pool.getGeneralInfos();
      counter++;
      console.log('Distributing...', counter);
    }
    expect(info[7].toString()).to.equal('5');
  });

})

function wait() {
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
}