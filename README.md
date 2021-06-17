# OtoGo - Launch Pools

This project consists on a Factory Contract that deploys customized Launch pools with different attributes. Each Launch pool is controlled by its Sponsor, who is responsible for setting its attributes and take decisions during pool lifetime.

## Specifications

#### Pool Lifetime

- **NonInitialized** - This is the first stage of the launchpool before it is initialized. We use the "initialize" function of the new launchpool to set its parameters.
- **Initialized** - Right after a Launchpool is initialized the stake/unstake is defined by values `_startTimestamp` and `_endTimestamp`. If `_startTimestamp` isn't reached, no action can be taken by stakers. Once `_startTimestamp` is reached, stakers could stake and unstake freely. Once `_endTimestamp` is reached, stake could only be called if there is still space for within the defined hard cap.
- **Paused** - Paused stage has to be triggered by Sponsor in case any problem occurs Once a launchpool is in pause,`stake` is no longer allowed  but, following our code audit, `unstake` is allowed.
- **Calculating** - Once `_endTimestamp` is reached, the Sponsor needs to call `lock` function. Once called, lock function will lead to Calculation stage. In this stage, Sponsor is allowed to trigger `calculateSharesChunk` to calculate how much tokens each stake will receive for the amount staked. The tokens are  calculated as long has `gasLeft` > 100000 on the transaction. Once `gasLeft` falls below 100000, the contract stops its calculation on the current index, and the function needs to be called again. This process is repeated until all stakers have their tokens calculated.
- **Distributing** - Once all tokens are calculated, the contract automatically triggers the stage Distributing. At this stage, Sponsor should trigger `distributeSharesChunk` on the smart contract, which transfers all calculated tokens to the respective stakers. The process is identical to the `calculateSharesChunk`: tokens are distributed as long as `gasLeft` > 100000 on the transaction. When `gasLeft` falls below 100000, the contract stops distributing on the current index, and the function needs to be called again. This process is repeated until all stakers receive their tokens..
- **Finalized** - Once the last tokens are distributed, the previous function automatically triggers Finalized stage. At this stage, the only function that could be triggered by the Sponsor is `withdrawStakes`. This will allow Sponsor to withdraw all amounts staked by the investors, whose capital is now committed.
- **Aborted** - At any moment during the launch pool phase, Sponsor can call the `abort` function. When aborted, the only function that stakers can call is the `unstake`function, which will let each investor retrieve their stakes.

![Otogo Launch Pool Lifetime](./docs/otogo-lifetime.png)

## Installation

Installing Ganache-cli (Local Ethereum Blockchain):

```sh
npm install -g ganache-cli
```

Installing Truffle + Mocha:

```sh
npm install -g truffle mocha
```

Installing dependencies:

```sh
npm install
```

## Tests 

Running ganache cli:

```sh
ganache-cli -p 8545
```

Running mocha tests:

```sh
truffle test
```

## Glossary 

- Factory Administrator - Define new types of curves that could be used, define the source code of launch pool to create Clones.
- Sponsor - The launch pool creator/owners, the one who defined all specifications of the launch pool and trigger transactiosn to proceed to next steps and abort launch pool in case of any problem.
- Investor - The user who stake/unstake some value on launch pool and receive some shares related to the project on launch pool is concluded.


## References:

#### Liquidity Pool And DAOs
[Balancer Liquidity Pool](https://medium.com/balancer-protocol/building-liquidity-into-token-distribution-a49d4286e0d4)

[BentoBox](https://boringcrypto.medium.com/bentobox-to-launch-and-beyond-d2d5dc2350bd)

[Sushi SWAP Documentation](https://help.sushidocs.com)

[Balancer Core Repo](https://github.com/balancer-labs/balancer-core)

[DAO Repo](https://github.com/blockchainsllc/DAO/blob/develop/DAO.sol)

#### ICOs

[ICO Smart Contracts](https://github.com/TokenMarketNet/smart-contracts/tree/master/contracts)

#### Calculating Bonuses

[Token Bonding Curves](http://coders-errand.com/token_bonding_curves/)

[More Token Bonding Curves](https://hackernoon.com/more-price-functions-for-token-bonding-curves-d42b325ca14b)

#### Identity and Whitelisting

[The Basics of Decentralized Identity](https://medium.com/uport/the-basics-of-decentralized-identity-d1ff01f15df1)

[3ID Provider](https://github.com/ceramicstudio/js-3id-did-provider)
[3ID Connect](https://github.com/ceramicstudio/3id-connect)

[Metamask Identity using textile.io](https://github.com/textileio/js-examples/blob/master/metamask-identities-ed25519/)

[UPort Decentralized ID ERC-1056](https://github.com/uport-project/ethr-did)

[Claims Registry](https://github.com/ethereum/EIPs/issues/780)

[Library to Create Verifiable Credentials](https://github.com/decentralized-identity/did-jwt-vc)
