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

interface InterfaceCurve {
    function fillPool(uint256 supply, uint256 stake, uint256 reducer) external returns(uint256);
}

contract LaunchPool {
    // Address of the sponsor that controls launch pools and token shares
    address private _sponsor;
    /*
     * Address of the token that was previously deployed by sponsor
     * _stakeMax must never surpass total token supply
    */
    address private _token;
    // Price curve distribution contract address
    address private _curve;
    // Reducer used by curve dustribution
    uint256 private _curveReducer;
    // IPFS hash containing JSON informations about the project
    string public metadata;
    // Defines start timestamp for Pool opens
    uint256 private _startTimestamp;
    // Defines timestamp for Pool closes
    uint256 private _endTimestamp;
    // 0 - Not Initialized - Not even set variables yet
    // 1 - Initialized - Not started yet, setup stage
    // 2 - Staking/Unstaking - Started
    // 3 - Paused - Staking stopped
    // 4 - Calculating - Bonus calculation finished, start distribution
    // 5 - Distributing - Finished distribution, start sponsor withdraw
    // 6 - Finalized - Allow sponsor withdraw
    // 7 - Failed
    enum Stages {
        NotInitialized,
        Initialized,
        Staking,
        Paused,
        Calculating,
        Distributing,
        Finalized,
        Aborted
    }
    Stages public stage = Stages.NotInitialized;

    // Token list to show on frontend
    address[] private tokenList;
    mapping(address => bool) private _allowedTokens;
    mapping(address => uint8) private _tokenDecimals;

    struct TokenStake {
		address investor;
        address token;
        // TODO Use this variable co calculare the correct token results
		uint256 amount;
        // Result bonus calculated based on curve and reducer
        uint256 shares;
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
    uint256 private _stakesCalculated;
    uint256 private _stakesDistributed;

    // **** EVENTS ****

    event Staked(uint256 index, address indexed investor, address indexed token, uint256 amount);
    event Unstaked(
        uint256 index,
        address indexed investor,
        address indexed token,
        uint256 amount
    );
    event Distributed(uint256 index, address indexed investor, uint256 amount, uint256 shares);
    event MetadataUpdated(
        string indexed newHash
    );

    // **** CONSTRUCTOR ****

    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _metadata,
        address _owner,
        address _sharesToken
    ) public {
        // Must not be initialized
        require(stage == Stages.NotInitialized, 'Contract already Initialized.');
        // Allow at most 3 coins
        require(
            allowedTokens.length >= 1 && allowedTokens.length <= 3,
            "There must be at least 1 and at most 3 tokens"
        );
        _stakesMin = uintArgs[0];
        _stakesMax = uintArgs[1];
        _startTimestamp = uintArgs[2];
        _endTimestamp = uintArgs[3];
        // Prevent stakes max never surpass Shares total supply
        require(
            InterfaceToken(_sharesToken).totalSupply() <= _stakesMax,
            "There must be at least 1 and at most 3 tokens"
        );
        // Store token allowance and treir decimals to easy normalize
        for (uint i = 0; i<allowedTokens.length; i++) {
            _tokenDecimals[allowedTokens[i]] = InterfaceToken(allowedTokens[i]).decimals();
            _allowedTokens[allowedTokens[i]] = true;
        }
        _sponsor = _owner;
        _token = _sharesToken;
        metadata = _metadata;
        stage = Stages.Initialized;
    }

    // **** MODIFIERS ****

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

    modifier isStaked() {
        require(block.timestamp >= _endTimestamp, "LaunchPool end timestamp not reached");
        require(stage == Stages.Finalized, "LaunchPool is not finalized");
        _;
    }

     modifier isCalculating() {
        require(
            stage == Stages.Calculating,
            "Tokens are not yet ready to calculate"
        );
        _;
    }

    modifier isDistributing() {
        require(
            stage == Stages.Distributing,
            "Tokens are not yet ready to distribute"
        );
        _;
    }

    modifier isFinalized() {
        require(
            stage == Stages.Finalized,
            "Launch pool not finalized yet"
        );
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

    // **** VIEWS ****

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
        return _stakesCount;
    }

    // **** INITIALIZED *****

    function updateMetadata(string memory _hash) external onlySponsor {
        metadata = _hash;
    }

    function open() external onlySponsor isInitialized {
        // TODO Define rules to open launch pool
        stage = Stages.Staking;
	}

    // **** STAKING *****

    /** @dev This allows investor to stake some ERC20 token. Make sure
     * You `ERC20.approve` to this contract before you stake.
     *
     * Requirements:
     *
     * - `token` Address of token contract to be staked
     * - `amount` The amount of tokens to stake
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

    /** @dev This allows investor to unstake a previously stake. A investor stakeID
     * must be passed as parameter. The investor stakes are created sequentially and could
     * be listed using stakesOf().
     *
     * Requirements:
     *
     * - `stakeId` The index of stake from a sender investor. Initiating at 0.
     */
    function unstake(uint256 stakeId) external {
        require(stage == Stages.Staking || stage == Stages.Aborted, "No Staking or Aborted stage.");
        require(_stakesByAccount[msg.sender].length > stakeId, "Stake index out of bounds");

        uint256 globalId = _stakesByAccount[msg.sender][stakeId];
        TokenStake memory _stake = _stakes[globalId];
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

    /** @dev This allows sponsor pause staking preventing investor to stake/unstake.
    * Only called by sponsor.
    **/
    function pause() external onlySponsor isStaking {
        // TODO Define rules to pause
        stage = Stages.Paused;
	}

    /** @dev Unpause launch pool returning back to staking/unstaking stage.
    * Only called by sponsor.
    **/
    function unpause() external onlySponsor isPaused {
        // TODO Define rules to unpause
        stage = Stages.Staking;
	}

    /** @dev Lock stakes and proceed to Calculating phase of launch pool.
     * Only called by sponsor.
    **/
    function lock() external onlySponsor isConcluded {
        // TODO Define rules to finalize / end timestamp? / total staked?
        // TODO Deploy tokens
		stage = Stages.Calculating;
	}

    // ***** CALCULATING ******

    /** @dev Calculate how much shares each investor will receive accordingly to their stakes.
     * Shares are calculated in order and skipped in case of has amount 0(unstaked).
     * In case of low gas, the calculation stops at the current stake index.
     * Only called by sponsor.
    **/
    function calculateSharesChunk() external onlySponsor isCalculating {
        // TODO Calculate investor shares based on how much gas is available
        InterfaceCurve curve = InterfaceCurve(_curve);
        while(_stakesCalculated < _stakesCount) {
            // Break while loop in case of lack of gas
            // TODO Make this gasLeft calculation more precise
            if (gasleft() < 100000) break;
            // In case that stake has amount 0, it could be skipped
            if (_stakes[_stakesCalculated].amount == 0) continue;
            _stakes[_stakesCalculated].shares = curve.fillPool(_stakesMax, _stakes[_stakesCalculated].amount, _curveReducer);
            _stakesCalculated++;
        }
        if (_stakesCalculated >= _stakesCount) {
            stage = Stages.Distributing;
        }
    }

    // ***** DISTRIBUTING *****

    function claimShares() external isDistributing {
        // TODO Define how tokens/shares could be claimed
    }

    /** @dev Distribute all shares calculated for each investor.
     * Shares are distributed in order and skipped in case of has amount 0(unstaked).
     * In case of low gas, the distribution stops at the current stake index.
     * Only called by sponsor.
    **/
    function distributeSharesChunk() external onlySponsor isDistributing {
        InterfaceToken token = InterfaceToken(_token);
        TokenStake memory _stake;
        while(_stakesDistributed < _stakesCount) {
            // Break while loop in case of lack of gas
            // TODO Make this gasLeft calculation more precise
            if (gasleft() < 100000) break;
            // In case that stake has amount 0, it could be skipped
            _stake = _stakes[_stakesDistributed];
            if (_stake.amount == 0) continue;
            token.transfer(_stake.investor, _stake.shares);
            // Zero amount and shares to not be distribute again same stake
            emit Distributed(
                _stakesDistributed,
                _stake.investor,
                _stake.amount,
                _stake.shares
            );
            _stakes[_stakesDistributed].amount = 0;
            _stakes[_stakesDistributed].shares = 0;
            _stakesDistributed++;
        }
        if (_stakesDistributed >= _stakesCount) {
            stage = Stages.Finalized;
        }
    }

    // **** FINALIZED *****

    function withdrawStakes(address token) external onlySponsor isFinalized {
        InterfaceToken instance = InterfaceToken(token);
        uint256 tokenBalance = instance.balanceOf(address(this));
        instance.transfer(
            msg.sender,
            tokenBalance
        );
    }

    // **** ABORTING & DEAD-MAN TRIGGER ****

    /** @dev Abort launch pool and allow all investors to unstake their tokens.
    * Only called by sponsor.
    **/
    function abort() external onlySponsor {
        // TODO Define rules to allow abort pool
        stage = Stages.Aborted;
    }

    /** @dev Dead-man trigger that abort launch pool and allow all investors to unstake their tokens.
    * Called by any investor after one week after ending timestamp.
    **/
    function abortImmediate() external {
        require(stage != Stages.Finalized, "Launch pool already finalized. Cannot be aborted.");
        require(_endTimestamp + 1 weeks > block.timestamp, "Not yet ready to trigger abort.");
        stage = Stages.Aborted;
    }

}