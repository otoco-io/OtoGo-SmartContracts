const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const PoolFactory = artifacts.require("PoolFactory");
const LaunchCurveSource = artifacts.require("LaunchCurveExponential");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Stake tests that should fail', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.curveSource = await LaunchCurveSource.deployed();
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 18);
    this.tokenWrong = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 19);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000','ether'), 18);
  });

  it('Try to create a pool with more than 3 tokens', async function () {
    try { 
      const pool = await LaunchPool.new()
      await pool.initialize(
        [this.token.address, this.token.address, this.token.address, this.token.address],
        [
        web3.utils.toWei('100'),
        web3.utils.toWei('2000000'),
        0,
        parseInt(Date.now()*0.001) + 10,
        10,
        100,
        web3.utils.toWei('0.5','ether'),
        web3.utils.toWei('2000000')
        ],
        'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
        accounts[0],
        this.shares.address,
        this.curveSource.address
      )
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('There must be at least 1 and at most 3 tokens');
    }
  })

  it('Try to create a pool with more shares than total supply', async function () {
    try { 
      const pool = await LaunchPool.new()
      await pool.initialize(
        [this.token.address, this.token.address, this.token.address],
        [
        web3.utils.toWei('100'),
        web3.utils.toWei('200000000000'),
        0,
        parseInt(Date.now()*0.001) + 10,
        10,
        100,
        web3.utils.toWei('0.5','ether'),
        web3.utils.toWei('2000000')
        ],
        'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
        accounts[0],
        this.shares.address,
        this.curveSource.address
      )
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Shares token has not enough supply for staking distribution');
    }
  })

  it('Try to create a pool with a token with more than 18 decimals', async function () {
    try { 
      const pool = await LaunchPool.new()
      await pool.initialize(
        [this.token.address, this.tokenWrong.address],
        [
        web3.utils.toWei('100'),
        web3.utils.toWei('2000000'),
        0,
        parseInt(Date.now()*0.001) + 10,
        10,
        100,
        web3.utils.toWei('0.5','ether'),
        web3.utils.toWei('2000000')
        ],
        'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
        accounts[0],
        this.shares.address,
        this.curveSource.address
      )
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Token allowed has more than 18 decimals');
    }
  })

  it('Try to stake on a non initialized pool', async function () {
    const pool = await LaunchPool.new()
    await this.token.approve(pool.address, web3.utils.toWei('2','ether'));
    try { 
      await pool.stake(this.token.address, web3.utils.toWei('1','ether'));
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Launch Pool is not staking');
      await wait();
    }
  })
 
  it('Deploy a new launch pool', async function () {
    const poolAddress = await this.factory.createLaunchPool(
      [this.token.address],
      [
      web3.utils.toWei('100'),
      web3.utils.toWei('5000000'),
      parseInt(Date.now()*0.001) + 5,
      parseInt(Date.now()*0.001) + 20,
      10,
      10000,
      web3.utils.toWei('1','ether'),
      web3.utils.toWei('50')
      ],
      'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
      this.shares.address,
      0,
      '0x0000000000000000000000000000000000000000'
    )
    this.pool = await LaunchPool.at(poolAddress.logs[0].args.pool);
    expect(await this.pool.metadata()).to.equal("QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra");
  });
  
  it ('Try to re-initialize pool by sponsor', async function () {
    try {
      await this.pool.initialize(
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
        'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
        accounts[0],
        this.shares.address,
        this.curveSource.address,
        {from:accounts[0]}
      );
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Initializable: contract is already initialized');
    }
  });

  it ('Try to re-initialize pool by third-party', async function () {
    try {
      await this.pool.initialize(
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
        'QmZuQMs9n2TJUsV2VyGHox5wwxNAg3FVr5SWRKU814DCra',
        accounts[0],
        this.shares.address,
        this.curveSource.address,
        {from:accounts[2]}
      );
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Initializable: contract is already initialized');
    }
  });

  it ('Try to stake before pool is opened', async function () {
    await this.token.approve(this.pool.address, web3.utils.toWei('2','ether'));
    try { 
      await this.pool.stake(this.token.address, web3.utils.toWei('1','ether'));
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Launch Pool has not started');
      await wait();
    }
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

  it ('Try to stake a not allowed token', async function () {
    await this.tokenWrong.approve(this.pool.address, web3.utils.toWei('2','ether'));
    try { 
      await this.pool.stake(this.tokenWrong.address, web3.utils.toWei('1','ether'));
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Cannot deposit that token');
    }
  });

  it ('Try to unpause a not paused pool', async function () {
    try { 
      await this.pool.unpause();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('LaunchPool is not paused');
    }
  });

  it ('Try to pause not being the sponsor', async function () {
    try { 
      await this.pool.pause({from:accounts[2]});
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Sponsor: caller is not the sponsor');
    }
  });

  it ('Pause the pool', async function () {
    await this.pool.pause();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('2');
  });

  it ('Try to re-pause a paused pool', async function () {
    try { 
      await this.pool.pause();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Launch Pool is not staking');
    }
  });

  it ('Unpause the pool', async function () {
    await this.pool.unpause();
    let info = await this.pool.getGeneralInfos();
    expect(info[7].toString()).to.equal('1');
  });

  it ('Try to lock launch pool before ends', async function () {
    try { 
      await this.pool.lock();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('LaunchPool end timestamp not reached');
    }
  });

  it ('Try to calculate before lock', async function () {
    try { 
      await this.pool.calculateSharesChunk();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Tokens are not yet ready to calculate');
    }
  });

  it ('Try to distribute before lock', async function () {
    try { 
      await this.pool.distributeSharesChunk();
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Tokens are not yet ready to distribute');
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