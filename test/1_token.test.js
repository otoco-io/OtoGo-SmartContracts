const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Token Tests', async (accounts) => {
  before(async function () {
    this.tokenInstance = await LaunchToken.deployed();
  });
 
  it('First Wallet must have all tokens.', async function () {
    let balance = await this.tokenInstance.balanceOf(accounts[0]);
    expect(balance.toString()).to.equal(web3.utils.toWei('100000000','ether'));
  });
})
