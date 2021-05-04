// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/escrow/Escrow.sol";
import "@openzeppelin/contracts/token/IERC20.sol";
import "./launchbonus";

contract LaunchPool {
    // 0 - Initialized - Not started yet, setup stage
    // 1 - Staking/unstaking - Started
    // 2 - Paused - Staking stopped
    // 3 - Finished - Staking finished, start calculation and distribution
    // 4 - Failed
    uint8 public status;
    string public name;
    uint256 private _startTimestamp;
    uint256 private _endTimestamp;
    uint256 private _tokenConversion;
    uint256 private _accountsStakeCount;

    LaunchBonus private _bonuses;
    // IPFS hash containing JSON informations about the project
    bytes32 public metadata;

    // Token list to show on frontend
    address[] private tokenList;
    mapping(address => bool) private _allowedTokens;
    mapping(address => uint8) private _tokenDecimals;

    struct TokenStake {
		address payee;
        address token;
        // TODO Use this variable co calculare the correct token result
        uint8 decimals;
		uint256 amount;
        // TODO Calculate this bonuses 
        uint256[] bonuses;
	}

    // Stakes struct array
    TokenStake[] private _stakes;
    // Points to respective stake on _stakes
    mapping(address => uint256[]) private _stakesByAccount;
    uint256 private _stakesMax;
    uint256 private _stakesMin;
    uint256 private _stakesTotal;
    // Prevent access elements bigger then stake size
    uint256 private _stakesCount;

    event Staked(address indexed payee, address indexed token, uint256 amount);
    event Unstaked(
        address indexed payee,
        address indexed token,
        address index,
        uint256 amount
    );

    constructor (
        string memory _poolName,
        address[] memory allowedTokens,
        uint256[] uintArgs,
        bytes32 _metadata,
    ) {
        // Allow at most 3 coins
        require(
            allowedTokens.length >= 1 && allowedTokens.length <= 3,
            "There must be at least 1 and at most 3 tokens"
        );
        require(
            allowedTokens.length == tokensDecimals.length,
            "Tokens and Decimals array should be same size"
        );
        name = _poolName;
        minCommitment = uintArgs[0];
        maxCommitment = uintArgs[1];
        _endTimestamp = uintArgs[2];
        _tokenConversion = uintArgs[3];

        for (uint i = 0; i<allowedTokens.length; i++) {
            _tokenDecimals[token] = IERC20(token).decimals();
            _allowedTokens[allowedTokens[i]] = true;
        }

        _bonuses = new LaunchBonus()
        for (uint i = 4; i<uintArgs.length; i+2) {
            _bonuses.addBonus(uintArgs[i], uintArgs[i+1]);
        }

        metadata = _metadata;
    }

    modifier isTokenAllowed(address _tokenAddr) {
        require(
            _allowedTokenAddresses[_tokenAddr],
            "Cannot deposit that token"
        );
        _;
    }

    modifier isLaunchPoolOpen() {
        require(now <= _endTimestamp, "LaunchPool is closed");
        _;
    }

    modifier hasRoomForDeposit(uint256 amount) {
        require(
            _totalStaked + amount <= maxCommitment,
            "Maximum staked amount exceeded"
        );
        _;
    }

    function updateMetadata(bytes32 _hash) external onlyOwner {
        metadata = _hash;
    }

    /** @dev This allows you to stake some ERC20 token. Make sure
     * You `ERC20.approve` to `LaunchPool` contract before you stake.
     */
    function stake(address token, uint256 amount)
        external
        isTokenAllowed(token)
        isLaunchPoolOpen
        hasRoomForDeposit(amount)
    {
        address payee = msg.sender;
        // If the transfer fails, we revert and don't record the amount.
        require(
            IERC20(token).transferFrom(
                msg.sender,
                address(this),
                amount
            ),
            "Did not get the moneys"
        );

        if (!_accountHasStaked(payee)) {
            _accountsStakeCount += 1;
        }

        memory uint256[] bonus = _bonuses.drainAmount(amount);
        _stakes[payee].push(TokenStake(payee, token, _tokenDecimals[token], amount, bonus))
        // TODO MUST consider token decimals
        _stakesByAccount[payee] = _stakesByAccount[payee] + amount;
        _totalStaked += amount;
        emit Staked(payee, token, amount);
    }

    function unstake(uint256 stakeId) external isTokenAllowed(token) {
        TokenStake currStake = _stakes[msg.sender][stakeId];

        _totalStaked -= currStake.amount;
        _stakesByAccount[msg.sender] -= currStake;
        _stakes[msg.sender][token] = 0;

        if (!_accountHasStaked(msg.sender)) {
            _accountsStakeCount -= 1;
        }

        require(
            IERC20Minimal(token).transfer(msg.sender, currStake),
            "Could not send the moneys"
        );

        emit Unstaked(msg.sender, token, currStake);
    }

    function stakesOf(address payee)
        public
        view
        returns (uint256)
    {
        return _stakes[payee];
    }

    function totalStakesOf(address payee) public view returns (uint256) {
        return _stakesByAccount[payee];
    }

    function totalStakes() public view returns (uint256) {
        return _totalStaked;
    }

    function isFunded() public view returns (bool) {
        return _totalStaked >= minCommitment;
    }

    function endTimestamp() public view returns (uint256) {
        return _endTimestamp;
    }

    /** Kind of a weird name. Will change it eventually. */
    function stakeCount() public view returns (uint256) {
        return _accountsStakeCount;
    }

    function _accountHasStaked(address account) private view returns (bool) {
        return _stakesByAccount[account] != 0;
    }

    function pause() external onlyOwner {
        // TODO Define rules to pause
        paused = true;
	}
    function unpause() external onlyOwner {
        // TODO Define rules to unpause
        paused = false;
	}

    function finalize() external onlyOwner {
        // TODO Define rules to finalize / end timestamp? / total staked?
        // TODO Deploy tokens
		finalized = true;
	}
    function withdrawStakes() external onlyOwner {
        // TODO Define rules to owner withdraw tokens / finalized?
    }

    function claimStakes() public {
        // TODO Define how stakes will be claimed
    }
}