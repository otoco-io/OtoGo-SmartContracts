const LaunchPool = artifacts.require("LaunchPool");
const LaunchToken = artifacts.require("LaunchToken");
const web3 = require('web3');
const { expect } = require('chai');

// Start test block
contract('Token Tests', async (accounts) => {
  before(async function () {
    // Deploy token
    this.tokenInstance = await LaunchToken.deployed();
  });
 
  it('Should Exist First Company', async function () {
    let balance = await this.tokenInstance.balanceOf(accounts[0]);
    expect(balance.toString()).to.equal("1000000");
  });
})
