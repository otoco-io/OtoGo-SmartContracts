// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
// import "./launchbonus";

interface InterfaceToken {
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract LaunchPool {
    address private _sponsor;
    // 0 - Not Initialized - Not even set variables yet
    // 1 - Initialized - Not started yet, setup stage
    // 2 - Staking/unstaking - Started
    // 3 - Paused - Staking stopped
    // 4 - Finished - Staking finished, start calculation and distribution
    // 5 - Failed
    enum Stages {NotInitialized, Initialized, Staking, Paused, Finalized, Aborted}
    Stages public stage = Stages.NotInitialized;
    string public name;
    // IPFS hash containing JSON informations about the project
    string public metadata;
    uint256 private _startTimestamp;
    uint256 private _endTimestamp;
    uint256 private _accountsStakeCount;

    // LaunchBonus private _bonuses;

    // Token list to show on frontend
    address[] private tokenList;
    mapping(address => bool) private _allowedTokens;
    mapping(address => uint8) private _tokenDecimals;

    struct TokenStake {
		address investor;
        address token;
        // TODO Use this variable co calculare the correct token results
		uint256 amount;
        // TODO Calculate this bonuses
        // uint256[] bonuses;
	}

    // Stakes struct mapping
    mapping(uint256 => TokenStake) private _stakes;
    // Points to respective stake on _stakes
    mapping(address => uint256[]) private _stakesByAccount;
    uint256 private _stakesMax;
    uint256 private _stakesMin;
    uint256 private _stakesTotal;
    // Prevent access elements bigger then stake size
    uint256 private _stakesCount;

    event Staked(uint256 index, address indexed investor, address indexed token, uint256 amount);
    event Unstaked(
        uint256 index,
        address indexed investor,
        address indexed token,
        uint256 amount
    );
    event MetadataUpdated(
        string indexed newHash
    );
    event NameUpdated(
        string indexed newName
    );

    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _poolName,
        string memory _metadata,
        address _owner
    ) public {
        require(stage == Stages.NotInitialized, 'Contract already Initialized.');
        // Allow at most 3 coins
        require(
            allowedTokens.length >= 1 && allowedTokens.length <= 3,
            "There must be at least 1 and at most 3 tokens"
        );
        name = _poolName;
        _stakesMin = uintArgs[0];
        _stakesMax = uintArgs[1];
        _startTimestamp = uintArgs[2];
        _endTimestamp = uintArgs[3];

        for (uint i = 0; i<allowedTokens.length; i++) {
            _tokenDecimals[allowedTokens[i]] = InterfaceToken(allowedTokens[i]).decimals();
            _allowedTokens[allowedTokens[i]] = true;
        }

        // _bonuses = new LaunchBonus()
        // for (uint i = 4; i<uintArgs.length; i+2) {
        //     _bonuses.addBonus(uintArgs[i], uintArgs[i+1]);
        // }

        _sponsor = _owner;
        metadata = _metadata;
        stage = Stages.Initialized;
    }

    modifier isTokenAllowed(address _tokenAddr) {
        require(
            _allowedTokens[_tokenAddr],
            "Cannot deposit that token"
        );
        _;
    }

    modifier isInitialized() {
        require(block.timestamp > _startTimestamp, "Launch Pool has not started");
        require(stage == Stages.Initialized, "Launch Pool is not Initialized");
        _;
    }

    modifier isStaking() {
        require(block.timestamp > _startTimestamp, "Launch Pool has not started");
        require(block.timestamp <= _endTimestamp, "Launch Pool is closed");
        require(stage == Stages.Staking, "Launch Pool is not staking");
        _;
    }

    modifier isPaused() {
        require(stage == Stages.Paused, "LaunchPool is not paused");
        _;
    }

    modifier isConcluded() {
        require(block.timestamp >= _endTimestamp, "LaunchPool end timestamp not reached");
        require(_stakesTotal >= _stakesMin, "LaunchPool not reached minimum stake");
        _;
    }

    modifier isFinalized() {
        require(block.timestamp >= _endTimestamp, "LaunchPool end timestamp not reached");
        require(stage == Stages.Finalized, "LaunchPool is not finalized");
        _;
    }

    modifier hasMaxStakeReached(uint256 amount) {
        require(
            _stakesTotal + amount <= _stakesMax,
            "Maximum staked amount exceeded"
        );
        _;
    }

    modifier onlySponsor() {
        require(sponsor() == msg.sender, "Sponsor: caller is not the sponsor");
        _;
    }

    /**
     * @dev Returns the address of the current sponsor.
     */
    function sponsor() public view virtual returns (address) {
        return _sponsor;
    }

    function stakesDetailedOf(address investor)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory stakes = new uint256[](_stakesByAccount[investor].length*2);
        for (uint i = 0; i < _stakesByAccount[investor].length; i ++){
            stakes[i*2] = _tokenDecimals[_stakes[_stakesByAccount[investor][i]].token];
            stakes[i*2 + 1] = _stakes[_stakesByAccount[investor][i]].amount;
        }
        return stakes;
    }

    function stakesOf(address investor) public view returns (uint256[] memory) {
        return _stakesByAccount[investor];
    }

    function stakesTotal() public view returns (uint256) {
        return _stakesTotal;
    }

    function isFunded() public view returns (bool) {
        return _stakesTotal >= _stakesMin;
    }

    function endTimestamp() public view returns (uint256) {
        return _endTimestamp;
    }

    function stakeCount() public view returns (uint256) {
        return _accountsStakeCount;
    }

    function updateName(string memory name_) external onlySponsor {
        name = name_;
    }

    function updateMetadata(string memory _hash) external onlySponsor {
        metadata = _hash;
    }

    function open() external onlySponsor isInitialized {
        // TODO Define rules to open launch pool
        stage = Stages.Staking;
	}

    /** @dev This allows you to stake some ERC20 token. Make sure
     * You `ERC20.approve` to `LaunchPool` contract before you stake.
     */
    function stake(address token, uint256 amount)
        external
        isStaking
        isTokenAllowed(token)
        hasMaxStakeReached(amount)
    {
        // If the transfer fails, we revert and don't record the amount.
        require(
            InterfaceToken(token).transferFrom(
                msg.sender,
                address(this),
                amount
            ),
            "Token transfer rejected"
        );

        // Store stake id after insert it to the queue
        TokenStake storage s = _stakes[_stakesCount];

        s.investor = msg.sender;
        s.token = token;
        s.amount = amount;

        _stakesByAccount[msg.sender].push(_stakesCount);
        _stakesTotal += amount;
        emit Staked(_stakesCount, msg.sender, token, amount);
        _stakesCount += 1;
    }

    // Enter a stake id from investor to unstake
    function unstake(uint256 stakeId) external {
        require(_stakesByAccount[msg.sender].length > stakeId, "Not the stake investor");

        uint256 globalId = _stakesByAccount[msg.sender][stakeId];
        TokenStake memory _stake = _stakes[globalId];

        require(_stake.investor == msg.sender, "Not the stake investor");
        require(_stake.amount > 0, "Stake already unstaked");
        require(
            InterfaceToken(_stake.token).transfer(msg.sender, _stake.amount),
            "Could not transfer stake back to the investor"
        );

        _stakesCount -= 1;
        _stakesTotal -= _stake.amount;
        _stakes[globalId].amount = 0;
        emit Unstaked(globalId, msg.sender, _stake.token, _stake.amount);
    }

    function pause() external onlySponsor isStaking {
        // TODO Define rules to pause
        stage = Stages.Paused;
	}
    function unpause() external onlySponsor isPaused {
        // TODO Define rules to unpause
        stage = Stages.Staking;
	}
    function finalize() external onlySponsor isConcluded {
        // TODO Define rules to finalize / end timestamp? / total staked?
        // TODO Deploy tokens
		stage = Stages.Finalized;
	}
    function withdrawStakes(address token) external onlySponsor isFinalized {
        // TODO Define rules to owner withdraw tokens / finalized?
        InterfaceToken instance = InterfaceToken(token);
        uint256 tokenBalance = instance.balanceOf(address(this));
        instance.transfer(
            msg.sender,
            tokenBalance
        );
    }
    function claimTokens() public {
        // TODO Define how stakes will be claimed

    }
}