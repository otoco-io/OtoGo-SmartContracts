// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface InterfaceToken {
    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

interface InterfaceCurve {
    function getShares(
        uint256 supply,
        uint256 pool,
        uint256 stake,
        uint256 reducer,
        uint256 minPrice
    ) external view returns (uint256);
}

contract LaunchPool {
    // Address of the sponsor that controls launch pools and token shares
    address private _sponsor;
    // IPFS hash containing JSON informations about the project
    string public metadata;
    /*
     * Address of the token that was previously deployed by sponsor
     * _stakeMax must never surpass total token supply
     */
    address private _token;
    // Price curve distribution contract address
    address private _curve;
    // Reducer used by curve dustribution
    uint256 private _curveReducer;
    // Reducer used by curve dustribution
    uint256 private _curveMinPrice;
    // Defines start timestamp for Pool opens
    uint256 private _startTimestamp;
    // Defines timestamp for Pool closes
    uint256 private _endTimestamp;
    // The total amount to be staked by sponsors
    uint256 private _stakesMax;
    // The minimum amount to be staken to approve launch pool
    uint256 private _stakesMin;
    // The total amount current staken at launch pool
    uint256 private _stakesTotal;
    // Prevent access elements bigger then stake size
    uint256 private _stakesCount;
    // The minimum amount for a unique stake
    uint256 private _stakeAmountMin;
    // 0 - Not Initialized - Not even set variables yet
    // 1 - Initialized
    //    Before Start Timestamp => Warm Up
    //    After Start Timestamp => Staking/Unstaking
    //    Before End Timestamp => Staking/Unstaking
    //    After End Timestamp => Only Staking
    // 2 - Paused - Staking stopped
    // 3 - Calculating - Bonus calculation finished, start distribution
    // 4 - Distributing - Finished distribution, start sponsor withdraw
    // 5 - Finalized - Allow sponsor withdraw
    // 6 - Aborted
    enum Stages {
        NotInitialized,
        Initialized,
        Paused,
        Calculating,
        Distributing,
        Finalized,
        Aborted
    }
    // Define current stage of launch pool
    Stages public stage = Stages.NotInitialized;

    // Token list to show on frontend
    address[] private _tokenList;
    mapping(address => bool) private _allowedTokens;
    mapping(address => uint8) private _tokenDecimals;

    struct TokenStake {
        address investor;
        address token;
        uint256 amount;
        // Result bonus calculated based on curve and reducer
        uint256 shares;
    }

    // Stakes struct mapping
    mapping(uint256 => TokenStake) private _stakes;
    // Points to respective stake on _stakes
    mapping(address => uint256[]) private _stakesByAccount;

    // Storing calculation index and balance
    uint256 private _stakesCalculated = 0;
    uint256 private _stakesCalculatedBalance = 0;
    // Storing token distribution index
    uint256 private _stakesDistributed = 0;

    // **** EVENTS ****

    event Staked(
        uint256 index,
        address indexed investor,
        address indexed token,
        uint256 amount
    );
    event Unstaked(
        uint256 index,
        address indexed investor,
        address indexed token,
        uint256 amount
    );
    event Distributed(
        uint256 index,
        address indexed investor,
        uint256 amount,
        uint256 shares
    );
    event MetadataUpdated(string indexed newHash);

    // **** CONSTRUCTOR ****

    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _metadata,
        address _owner,
        address _sharesAddress,
        address _curveAddress
    ) public {
        // Must not be initialized
        require(stage == Stages.NotInitialized, "Contract already Initialized");
        // Allow at most 3 coins
        require(
            allowedTokens.length >= 1 && allowedTokens.length <= 3,
            "There must be at least 1 and at most 3 tokens"
        );
        _stakesMin = uintArgs[0];
        _stakesMax = uintArgs[1];
        _startTimestamp = uintArgs[2];
        _endTimestamp = uintArgs[3];
        _curveReducer = uintArgs[4];
        _stakeAmountMin = uintArgs[5];
        _curveMinPrice = uintArgs[6];
        // Prevent stakes max never surpass Shares total supply
        require(
            InterfaceToken(_sharesAddress).totalSupply() >= InterfaceCurve(_curveAddress).getShares(
                _stakesMax,
                0,
                _stakesMax,
                _curveReducer,
                _curveMinPrice
            ),
            "Shares token has not enough supply for staking distribution"
        );
        // Store token allowance and treir decimals to easy normalize
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            require(
                InterfaceToken(allowedTokens[i]).decimals() <= 18,
                "Token allowed has more than 18 decimals"
            );
            _tokenDecimals[allowedTokens[i]] = InterfaceToken(allowedTokens[i])
                .decimals();
            _allowedTokens[allowedTokens[i]] = true;
            _tokenList.push(allowedTokens[i]);
        }
        _curve = _curveAddress;
        _sponsor = _owner;
        _token = _sharesAddress;
        metadata = _metadata;
        stage = Stages.Initialized;
    }

    // **** MODIFIERS ****

    modifier isTokenAllowed(address _tokenAddr) {
        require(_allowedTokens[_tokenAddr], "Cannot deposit that token");
        _;
    }

    modifier isInitialized() {
        require(
            block.timestamp > _startTimestamp,
            "Launch Pool has not started"
        );
        require(stage == Stages.Initialized, "Launch Pool is not Initialized");
        _;
    }

    modifier isStaking() {
        require(
            block.timestamp > _startTimestamp,
            "Launch Pool has not started"
        );
        require(stage == Stages.Initialized, "Launch Pool is not staking");
        _;
    }

    modifier isPaused() {
        require(stage == Stages.Paused, "LaunchPool is not paused");
        _;
    }

    modifier isConcluded() {
        require(
            block.timestamp >= _endTimestamp,
            "LaunchPool end timestamp not reached"
        );
        require(
            _stakesTotal >= _stakesMin,
            "LaunchPool not reached minimum stake"
        );
        _;
    }

    modifier isStaked() {
        require(
            block.timestamp >= _endTimestamp,
            "LaunchPool end timestamp not reached"
        );
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
        require(stage == Stages.Finalized, "Launch pool not finalized yet");
        _;
    }

    modifier isAborted() {
        require(stage == Stages.Aborted, "Launch Pool not aborted");
        _;
    }

    modifier hasMaxStakeReached(uint256 amount, address token) {
        // The multiplications allow prevent that tokens with less than 18 decimals pass through
        require(
            _stakesTotal + amount * (10**(18 - _tokenDecimals[token])) <=
                _stakesMax,
            "Maximum staked amount exceeded"
        );
        _;
    }

    modifier onlySponsor() {
        require(sponsor() == msg.sender, "Sponsor: caller is not the sponsor");
        _;
    }

    // **** VIEWS ****

    // Returns the sponsor address, owner of the contract
    function sponsor() public view virtual returns (address) {
        return _sponsor;
    }

    // Return the token list alllowed on launch pool
    function tokenList() public view returns (address[] memory) {
        return _tokenList;
    }

    /**
     * @dev Returns detailed stakes from an sponsor.
     * Stakes are returned as single dimension array.
     * [0] Amount of token decimals for first sponsor stake
     * [1] Stake amount of first stake
     * and so on...
     */
    function stakesDetailedOf(address sponsor_)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory stakes =
            new uint256[](_stakesByAccount[sponsor_].length * 2);
        for (uint256 i = 0; i < _stakesByAccount[sponsor_].length; i++) {
            stakes[i * 2] = _tokenDecimals[
                _stakes[_stakesByAccount[sponsor_][i]].token
            ];
            stakes[i * 2 + 1] = _stakes[_stakesByAccount[sponsor_][i]].amount;
        }
        return stakes;
    }

    /**
     * @dev Return global stake indexes for a specific investor.
     */
    function stakesOf(address sponsor_) public view returns (uint256[] memory) {
        return _stakesByAccount[sponsor_];
    }

    function stakesList() public view returns (uint256[] memory) {
        uint256[] memory stakes = new uint256[](_stakesCount);
        for (uint256 i = 0; i < _stakesCount; i++) {
            stakes[i] = _stakes[i].amount;
        }
        return stakes;
    }

    /**
     * @dev Get Stake shares for interface calculation.
     */
    function getStakeShares(uint256 amount, uint256 balance)
        public
        view
        returns (uint256)
    {
        return
            InterfaceCurve(_curve).getShares(
                _stakesMax,
                balance,
                amount,
                _curveReducer,
                _curveMinPrice
            );
    }

    /**
     * @dev Get general info about launch pool. Return Uint values
     */
    function getGeneralInfos() public view returns (uint256[] memory values) {
        values = new uint256[](9);
        values[0] = _startTimestamp;
        values[1] = _endTimestamp;
        values[2] = _stakesMin;
        values[3] = _stakesMax;
        values[4] = _stakesTotal;
        values[5] = _stakesCount;
        values[6] = _curveReducer;
        values[7] = uint256(stage);
        values[8] = _stakeAmountMin;
        return values;
    }

    // **** INITIALIZED *****

    /** @dev Update metadata informations for launch pool
     **/
    function updateMetadata(string memory _hash) external onlySponsor {
        metadata = _hash;
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
        hasMaxStakeReached(amount, token)
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
        uint256 normalizedAmount = amount * (10**(18 - _tokenDecimals[token]));
        require(
            normalizedAmount >= _stakeAmountMin,
            "Stake below minimum amount"
        );
        // Store stake id after insert it to the queue
        TokenStake storage s = _stakes[_stakesCount];

        s.investor = msg.sender;
        s.token = token;
        // Convert any token amount that has less than 18 decimals to 18
        s.amount = normalizedAmount;

        _stakesTotal += s.amount;
        _stakesByAccount[msg.sender].push(_stakesCount);
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
        require(
            stage == Stages.Initialized || stage == Stages.Aborted,
            "No Staking or Aborted stage."
        );
        if (stage == Stages.Initialized) {
            require(block.timestamp <= _endTimestamp, "Launch Pool is closed");
        }
        require(
            _stakesByAccount[msg.sender].length > stakeId,
            "Stake index out of bounds"
        );

        uint256 globalId = _stakesByAccount[msg.sender][stakeId];
        TokenStake memory _stake = _stakes[globalId];
        require(_stake.amount > 0, "Stake already unstaked");
        require(
            // In case of 6 decimals (USDC, USDC, etc.) tokens need to be converted back.
            InterfaceToken(_stake.token).transfer(
                msg.sender,
                _stake.amount / (10**(18 - _tokenDecimals[_stake.token]))
            ),
            "Could not transfer stake back to the investor"
        );

        _stakesTotal -= _stake.amount;
        _stakes[globalId].amount = 0;
        emit Unstaked(globalId, msg.sender, _stake.token, _stake.amount);
    }

    /** @dev This allows sponsor pause staking preventing investor to stake/unstake.
     * Only called by sponsor.
     **/
    function pause() external onlySponsor isStaking {
        stage = Stages.Paused;
    }

    /** @dev Unpause launch pool returning back to staking/unstaking stage.
     * Only called by sponsor.
     **/
    function unpause() external onlySponsor isPaused {
        stage = Stages.Initialized;
    }

    /** @dev Lock stakes and proceed to Calculating phase of launch pool.
     * Only called by sponsor.
     **/
    function lock() external onlySponsor isConcluded {
        stage = Stages.Calculating;
    }

    // ***** CALCULATING ******

    /** @dev Calculate how much shares each investor will receive accordingly to their stakes.
     * Shares are calculated in order and skipped in case of has amount 0(unstaked).
     * In case of low gas, the calculation stops at the current stake index.
     * Only called by sponsor.
     **/
    function calculateSharesChunk() external onlySponsor isCalculating {
        InterfaceCurve curve = InterfaceCurve(_curve);
        while (_stakesCalculated < _stakesCount) {
            // Break while loop in case of lack of gas
            // TODO Make this gasLeft calculation more precise
            if (gasleft() < 100000) break;
            // In case that stake has amount 0, it could be skipped
            if (_stakes[_stakesCalculated].amount > 0) {
                _stakes[_stakesCalculated].shares = curve.getShares(
                    _stakesMax,
                    _stakesCalculatedBalance,
                    _stakes[_stakesCalculated].amount,
                    _curveReducer,
                    _curveMinPrice
                );
                _stakesCalculatedBalance += _stakes[_stakesCalculated].amount;
            }
            _stakesCalculated++;
        }
        if (_stakesCalculated >= _stakesCount) {
            stage = Stages.Distributing;
        }
    }

    // ***** DISTRIBUTING *****

    /** @dev Distribute all shares calculated for each investor.
     * Shares are distributed in order and skipped in case of has amount 0(unstaked).
     * In case of low gas, the distribution stops at the current stake index.
     * Only called by sponsor.
     **/
    function distributeSharesChunk() external onlySponsor isDistributing {
        InterfaceToken token = InterfaceToken(_token);
        TokenStake memory _stake;
        while (_stakesDistributed < _stakesCount) {
            // Break while loop in case of lack of gas
            // TODO Make this gasLeft calculation more precise
            if (gasleft() < 100000) break;
            // In case that stake has amount 0, it could be skipped
            _stake = _stakes[_stakesDistributed];
            if (_stake.amount > 0) {
                token.transferFrom(_sponsor, _stake.investor, _stake.shares);
                // Zero amount and shares to not be distribute again same stake
                emit Distributed(
                    _stakesDistributed,
                    _stake.investor,
                    _stake.amount,
                    _stake.shares
                );
                _stakes[_stakesDistributed].amount = 0;
                _stakes[_stakesDistributed].shares = 0;
            }
            _stakesDistributed++;
        }
        if (_stakesDistributed >= _stakesCount) {
            stage = Stages.Finalized;
        }
    }

    // **** FINALIZED *****

    /** @dev Sponsor withdraw stakes after finalized pool.
     *  This could also be used to withdraw remain not used shared
     **/
    function withdrawStakes(address token) external onlySponsor isFinalized {
        InterfaceToken instance = InterfaceToken(token);
        uint256 tokenBalance = instance.balanceOf(address(this));
        instance.transfer(msg.sender, tokenBalance);
    }

    // **** ABORTING ****

    /** @dev Abort launch pool and allow all investors to unstake their tokens.
     * Only called by sponsor.
     **/
    function abort() external onlySponsor {
        // TODO Define rules to allow abort pool
        stage = Stages.Aborted;
    }
}
