const LaunchCurve = artifacts.require("LaunchCurveExponential");
const web3 = require('web3');
const BN = require('bn.js');
const { expect } = require('chai');

// Start test block
contract('Exponential Curve Tests', async (accounts) => {
  before(async function () {
    // Deploy token
    this.curve = await LaunchCurve.deployed();
  });
 
  it('Simulate a curve with 20 investors', async function () {
    let balance = new BN(0);
    let supply = new BN(web3.utils.toWei('2000000', 'ether'));
    let lastResult = new BN(web3.utils.toWei('100000', 'ether'));

    for(let i = 0; i<20; i++) {
      let stake = new BN(web3.utils.toWei('100000', 'ether'));
      let res = await this.curve.getShares(supply.toString(), balance.toString(), stake.toString(), '10', web3.utils.toWei('1', 'ether'));
      console.log('STAKE:', stake.toString());
      console.log('SHARE:', res.toString());
      balance = balance.add(stake);
      expect(lastResult.gte(res)).to.be.true;
      expect(stake.gte(res)).to.be.true;
      lastResult = res;
    }
  });

  it('Simulate a curve with 100 investors', async function () {
    let balance = new BN(0);
    let supply = new BN(web3.utils.toWei('200000000000', 'ether'));
    let lastResult = new BN(web3.utils.toWei('200000000000', 'ether'));

    for(let i = 0; i<100; i++) {
      let stake = new BN(web3.utils.toWei('1000000000', 'ether'));
      let res = await this.curve.getShares(supply.toString(), balance.toString(), stake.toString(), '10', web3.utils.toWei('0.5', 'ether'));
      console.log('STAKE:', stake.toString());
      console.log('SHARE:', res.toString());
      expect(lastResult.gte(res)).to.be.true;
      // expect(stake.gte(res)).to.be.true;
      balance = balance.add(stake);
      lastResult = res;
    }
  });

  it('Simulate a curve with exponential reduce stakes', async function () {
    let balance = new BN(0);
    let supply = new BN(web3.utils.toWei('200000', 'ether'));
    let lastResult = new BN(web3.utils.toWei('100000', 'ether'));
    let lastCurve = new BN(web3.utils.toWei('0', 'ether'));
    for(let i = 0; i<50; i++) {
      let stake = new BN(supply.sub(balance).div(new BN(2), 'ether'));
      let res = await this.curve.getShares(supply.toString(), balance.toString(), stake.toString(), '3', web3.utils.toWei('0.5', 'ether'));
      let curve = await this.curve.getCurve(supply.toString(), balance.toString(), '3');
      console.log('STAKE:', stake.toString());
      console.log('SHARE:', res.toString());
      //expect(stake.gte(res)).to.be.true;
      expect(curve.gte(lastCurve)).to.be.true;
      balance = balance.add(stake);
      lastResult = res;
      lastCurve = curve;
    }
  });

  it('Simulate a curve with exponential reduce stakes', async function () {
    let supply = new BN(web3.utils.toWei('200000', 'ether'));
    let stake = new BN(web3.utils.toWei('1', 'ether'));
    let res1 = await this.curve.getShares(supply.toString(), supply, stake.toString(), '10', web3.utils.toWei('1', 'ether'));
    console.log('RELATION STAKE x RESULT:', res1.div(stake.div(new BN(100))).toString(), '%');
    let res2 = await this.curve.getShares(supply.toString(), supply, stake.toString(), '100', web3.utils.toWei('1', 'ether'));
    console.log('RELATION STAKE x RESULT:', res2.div(stake.div(new BN(100))).toString(), '%');
    let res3 = await this.curve.getShares(supply.toString(), supply, stake.toString(), '400', web3.utils.toWei('1', 'ether'));
    console.log('RELATION STAKE x RESULT:', res3.div(stake.div(new BN(100))).toString(), '%');
    expect(stake.gte(res1)).to.be.true;
    expect(res3.gte(res2)).to.be.true;
    expect(res2.gte(res1)).to.be.true;
  });

})
