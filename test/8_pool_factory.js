const PoolFactory = artifacts.require("PoolFactory");
const LaunchToken = artifacts.require("LaunchToken");
const LaunchPoolSource = artifacts.require("LaunchPool");
const LaunchCurveSource = artifacts.require("LaunchCurveExponential");
const { expect } = require('chai');

// Start test block
contract('Pool Factory Tests', async (accounts) => {
  before(async function () {
    // Deploy token
    this.factory = await PoolFactory.deployed();
    this.newCurve = await LaunchCurveSource.new();
    this.newPool = await LaunchPoolSource.new();
    this.token = await LaunchToken.new('Test DAI', 'DAI', web3.utils.toWei('100000000','ether'), 18);
    this.token2 = await LaunchToken.new('Test USDT', 'USDT', web3.utils.toWei('100000000','mwei'), 6);
    this.shares = await LaunchToken.new('Token Shares', 'SHAR', web3.utils.toWei('10000000','ether'), 18);
  });

  it('Try re-initialize Pool Factory from owner', async function () {
    try { 
      await this.factory.initialize(this.newPool.address, this.newCurve.address)
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Initializable: contract is already initialized');
    }
  })
 
  it('Try re-initialize Pool Factory from third-party', async function () {
    try { 
      await this.factory.initialize(this.newPool.address, this.newCurve.address, {from:accounts[1]})
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Initializable: contract is already initialized');
    }
  })

  it('Try update Pool Source from third-party', async function () {
    try { 
      await this.factory.updatePoolSource(this.newPool.address, {from:accounts[1]})
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Ownable: caller is not the owner');
    }
  })

  it('Try add Curve Source from third-party', async function () {
    try { 
      await this.factory.addCurveSource(this.newCurve.address, {from:accounts[1]})
      expect(false).to.be.true; // Should not pass here
    } catch (err) {
      expect(err.reason).to.be.equals('Ownable: caller is not the owner');
    }
  })

  it ('Update Pool Source from owner and check event', async function () {
    const receipt = await this.factory.updatePoolSource(this.newPool.address)
    expect(receipt.logs[0].args.newSource).to.equal(this.newPool.address);
  });

  it ('Add Curve Source from owner and check event', async function () {
    const receipt = await this.factory.addCurveSource(this.newCurve.address)
    expect(receipt.logs[0].args.newSource).to.equal(this.newCurve.address);
  });

})
