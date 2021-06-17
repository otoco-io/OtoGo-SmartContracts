## CORRECTIONS RELATED TO Otoco - Smart Contract Audit v210614

### COMMIT

The commit related to the corrections is: ```487faac83396759d203795aa1c926d7f6bda2ead```

We recommend run tests using command: ```truffle test --compile-all```
Due to problems with truffle-upgrade that redeploy some contrats every run

### ASSESSMENT

**PoolFactory.sol** 
- updateTokenContract function renamed to updatePoolSource.
- Added two events UpdatedPoolSource/AddedCurveSource with respective tests at 8_pool_factory
- Added tests trying to re-initialize contract at 8_pool_factory
**LaunchPool.sol**
- Fixed typo on 1 year span. 
- Removed indexing to UpdatedMetadata event parameter
- Added test for Metadataupdated event at 1_stake
- Corrected ambiguity from sponsor and investor
- Added Initializer Modifier
 
**LaunchToken.sol** -  Will not be used by the app itself, just used during tests to simulate USDT, DAI and share tokens

### ISSUES

**OGO-001** - Fixed using __Ownable_init call on initialize function at PoolFactory.

**OGO-002** - Fixed using regular clone

**OGO-003** - Due to strict deadline, not possible to implement Code Coverage tests right now. We have implemented tests to check event triggering.
 - PoolFactory - PoolCreated tested on 4_workflow and 5_workflow. All others events appear at 8_pool_factory 
 - LaunchPool - Stake/Unstake/Distributed events tested at 5_worflow.

**OGO-004** - Fixed using initializer modifier on Launch pool

**OGO-005** - Fixed using SafeERC20 Library on all transfer and transferFrom

**OGO-006** - Fixed using safeTransferFrom

**OGO-007** - Fixed using a difference of balance before and after transfer

**OGO-008** - We will allow unstake on paused stage, but for the possibility of cheater sponsor we don't consider a big issue since investors should trust sponsor by default, also we don't see any benefit from sponsor locking funds on the contract, we assume that would be better just distribute shares.