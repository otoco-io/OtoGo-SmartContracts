# OtoGo - Launch Pools

This project consists of a Factory Contract that deploys customized Launch pools with different attributes. Each Launch pool is controlled by its Sponsor, who is responsible for setting its attributes and take decisions during the pool lifetime.

## Installation

Installing Truffle + Mocha:

```sh
npm install -g truffle mocha
```

Installing dependencies:

```sh
npm install
```

## Tests 

Running code coverage tests:

```sh
truffle run coverage
```

## User Specifications

### Pre-Launch Requirements

At the pre-launch moment, the Sponsor should decide all launch pool aspects:
- **Allowed tokens** (`_allowedTokens`) by the launch pool, any ERC20 token. It's an array pointing to the addresses of the tokens accepted as stakes. Recommend using only stable tokens or different tokens with similar values, due to all be normalized with 18 decimals and considered has the same weight in staking. Any different token that those allowed by the launch pool will be rejected.
- **The Minimum amount of stakes** (`_stakesMin`) that should be staked to launch pool to be considered succeded.
- **The Maximum amount of stakes** (`_stakesMax`) that could be staked at the launch pool.
- **Start timestamp** (`_startTimestamp`)that will allow users start to stake. If it is smaller than the current timestamp, it will be considered already opened for staking.
- **End timestamp** (`_endTimestamp`) that marks the last moment where users could unstake. After that Sponsor could lock the launch pool in case of reach `_stakesMin`. In case of launch pool isn't reached the `_stakesMax`, users could still stake if Sponsor not call function `lock`.
- **Minimum stake amount** (`_stakeAmountMin`) that a single stake should have. Any stake smaller than that amount will be rejected.
- **Maximum stake amount** (`_stakeClamp`) that a single stake should have. Any stake larger than that amount will be rejected.
- **Minimum Price** (`_curveMinPrice`) is the minimum price usually paid for the first investor in the pool.
- **Curve Reducer** (`_curveReducer`) is the smooth factor for the curve, for the standard curve already implemented, that is exponential, this factor reduces the strength of the curve. E.g.: a smaller value like 1 will make the last staking unit pays 7100% more for a share than `_curveMinPrice`. A bigger value like 100 will make the last stake unit cost only 72% more for a share than `_curveMinPrice`.
- **Curve Contract Address** (`_curveAddress`) is the address of the respective contract containing the functions for curve shares calculation.
- **Launch Pool Metadata** (`metadata`) a JSON file stored on IPFS containing launch pool additional information. The required fields are `title` and `description`. But the idea is to add any kind of links to social media and informational links for the launch pool.
- **Shares Contract Address** (`_token`) a pre-deployed token containing enough shares to be distributed at the end of the launch pool. At the Distribution stage, the sponsor should approve the launch pool to transfer those shares belonging to him, **no need for the Sponsor to transfer any token to the launch pool**. The sponsor should have enough tokens to be distributed approved for the launch pool contract, otherwise, the distribution will not be concluded by the launch pool.

> Note: The tokens to be distributed should have enough supply for that. The equation used by the contract to know this value is: `supply required = _curveMinPrice * _stakeMax`

> Note: During the launch pool lifetime, it isn't possible to transfer the Sponsorship of the launch pool.

### Sponsor Checklist

1) Have a pre-deployed token to be distributed with enough shares on belong of him.
2) Have a pinned metadata JSON file on IPFS with information related to the launch pool.
3) Be sure that all allowed tokens to stake have similar value.
4) Define the above specs of the launch pool related to the curve and price that fulfill its interest.

### Launch Pool Stages

#### NonInitialized
This is the first stage of the launch pool before it is initialized. We use the `initialize` function of the new launch pool to set its parameters. The contract does not use the constructor function due to the nature of the clones used by the factory.
#### Initialized
Right after a Launchpool is initialized the stake/unstake is defined by values `_startTimestamp` and `_endTimestamp`. If `_startTimestamp` isn't reached, no action can be taken by the investor. Once `_startTimestamp` is reached, investors could `stake` and `unstake` freely, **INVESTORS SHOULD NOT TRANSFER MANUALLY TOKENS TO LAUNCH POOL CONTRACT**. Once `_endTimestamp` is reached, the stake could only be called if there is still space for it within the defined hard cap. At any moment in Initialized stage sponsor could call `pause` to prevent investors from the stake or `abort`.
#### Paused
The paused stage has to be triggered by the Sponsor using `pause` function in case any problem occurs, `pause` could only be called on initialized stage. Once a launch pool is in pause, `stake` is no longer allowed but, following our code audit, `unstake` is allowed. During the paused stage, the only functions that could be called by the sponsor are `unpause` that return to the initialized stage, and `abort` that changes pool to the aborted stage.
#### Calculating
Once `_endTimestamp` is reached and the `_stakesMin` has been fulfilled, the Sponsor needs to call the `lock` function before start calculating shares. Once called, the lock function will lead to the Calculation stage and no investor is allowed to `stake` or `unstake`. In this stage, the Sponsor is allowed to trigger `calculateSharesChunk` to calculate how many tokens each stake will receive for the amount staked. The tokens are calculated as long as `gasLeft > 100000` on the transaction. Once `gasLeft` falls below 100000, the contract stops its calculation on the current index, and the function needs to be called again. This process is repeated until all investors have their tokens calculated.
#### Distributing  
Once all tokens are calculated, the contract automatically triggers the stage Distributing. 
At this moment Sponsor should have all shares to distribute, those shares should be `approved` for launch pool transfer. **SPONSOR SHOULD NOT TRANSFER MANUALLY TOKENS TO LAUNCH POOL CONTRACT**. After that, Sponsor should trigger `distributeSharesChunk` on the smart contract, which transfers all calculated tokens to the respective investor. The process is identical to the `calculateSharesChunk`: tokens are distributed as long as `gasLeft > 100000` on the transaction. When `gasLeft` falls below 100000, the contract stops distributing on the current index, and the function needs to be called again. This process is repeated until all investors receive their tokens.
#### Finalized
Once the last tokens are distributed, the previous function automatically triggers Finalized stage. At this stage, the only function that could be triggered by the Sponsor is `withdrawStakes`. This will allow Sponsor to withdraw all amounts staked by the investors, whose capital is now committed.
#### Aborted
At any moment during the launch pool phase, Sponsor can call the `abort` function. When aborted, the only function that investors can call is the `unstake` function, which will let each investor retrieve their stakes.

![Otogo Launch Pool Lifetime](./docs/otogo-lifetime.png)

> Note: Shares/tokens, as well as investors, are used interchangeably here.

## Technical Details

### Launch Curve Contract

A launch curve is a utilitary contract used to create the curve of token price/distribution. The idea is to use as an interface for different kind of bounding curve algorithms. It is based on three functions:
- **Get Shares** (`GetShares`) - Calculate the return shares (in Wei) of a stake based on a total supply, pool balance, and a reducer factor.
`supply` The total supply of the launch pool.
`pool` The current balance of the pool to be calculated.
`stake` The current stake to return the amount of respective tokens.
`reducer`  The reducer factor makes the curve less exponential. Recommended 1 to 400.
`minPrice` The minimum price for token stake could pay for.
- **Get Unit Price** (`GetUnitPrice`) - Return the unit price (in Wei) for each staked token based on the current state of the pool.
`supply` The total supply of the launch pool.
`pool` The current balance of the pool to be calculated.
`reducer` The reducer factor makes the curve less exponential. Recommended 1 to 400.
`minPrice` The minimum price for token stake could pay for.
- **Get Curve** (`GetCurve`) - The variation of price in Wei starting form 0.
`supply` The total supply of the launch pool.
`pool` The current balance of the pool to be calculated.
`reducer` The reducer factor makes the curve less exponential. Recommended 1 to 400.

### Pool Factory Contract

The ownable/upgradeable contract owned by OtoCo, stores a record of the launch pool deployed by it. Also is used to store the last source of launch pool contract used to clone. This contract could be used to deploy new launch pools with a secure/updated source for it. It also holds all kinds of Curve contracts audited and tested that guarantee integration with launch pools.

The contract itself could be upgraded to support future implementations.

There's only a single function to call:
#### Create Launch Pool (`createLaunchPool`)
Deploy a new launch pool with the parameters set by the caller. The caller will be automatically the Sponsor of the launch pool. This function needs to follow the following parameters:
- **Allowed Tokens** (`_allowedTokens`) - With an array of ERC20 tokens that will be used to stake.
- **Integer Arguments** (`_uintArgs`) - With an array containing the respective values in order: `_stakesMin`, `_stakesMax`, `_startTimestamp`, `_endTimestamp`, `_curveReducer`, `_stakeAmountMin`, `_curveMinPrice`, `_stakeClamp`.
- **Pool Metadata** (`_metadata`) - With a string of an IPFS hash pointing to a JSON file.
- **Token Contract** (`_shares`) - With the address of the contracts containing the shares/tokens to be distributed.
- **Curve Algorithm To Use** (`_curve`) - With an integer representing the index of the Curve stored on the contract. Recommended use value 0.

## Networks

### Ethereum Mainnet
| Contract | Address |
| ----------- | ----------- |
| Launch Pool | [0xDf786Ac51d177aeCe3D34Ffa687D57c493C3Af79](https://etherscan.io/address/0xDf786Ac51d177aeCe3D34Ffa687D57c493C3Af79) |
| Curve Exponential |  [0x8082a2fEFc36FeF1EaFa164B1F723C319a3E911E](https://etherscan.io/address/0x8082a2fEFc36FeF1EaFa164B1F723C319a3E911E) |
| OtoCo Token | [0x23eC026590d6CCCfEce04097F9B49aE6A442C3BA](https://etherscan.io/token/0x23eC026590d6CCCfEce04097F9B49aE6A442C3BA)

### Ropsten Testnet
| Contract | Address |
| ----------- | ----------- |
| Pool Factory | [0xF3e365aAE8fFB292cc88f4aBAF1a7C2900a340F4](https://etherscan.io/address/0xF3e365aAE8fFB292cc88f4aBAF1a7C2900a340F4)
| Launch Pool | [0x4b10592e0A37d8e9A3CE75D928c3d053345C3dc4](https://etherscan.io/address/0x4b10592e0A37d8e9A3CE75D928c3d053345C3dc4) |
| Curve Exponential |  [0xc64d01bA584643a5bc04C6BD32E793aD1E11DFbA](https://etherscan.io/address/0xc64d01bA584643a5bc04C6BD32E793aD1E11DFbA) |

## Glossary 

- Factory Administrator - Define new types of curves that could be used, define the source code of the launch pool to create Clones.
- Sponsor - The launch pool creator/owners, the ones who defined all specifications of the launch pool and trigger transactions to proceed to the next steps and abort the launch pool in case of any problem.
- Investor/Staker - The user who staked/unstaked some value on the launch pool and received some shares related to the project when the launch pool is concluded.

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
