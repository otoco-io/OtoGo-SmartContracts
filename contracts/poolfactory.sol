// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/contracts/proxy/ClonesUpgradeable.sol";

contract PoolFactory is OwnableUpgradeable {
    event PoolCreated(address indexed series, address value);

    address private _poolSource;

    function initialize(address poolSource) external {
        _poolSource = poolSource;
    }

    function updateTokenContract(address newAddress) public onlyOwner {
        _poolSource = newAddress;
    }

    function createLaunchPool (
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _poolName,
        string memory _metadata
    ) external {
        require(previousSeries.length == previousTokens.length, 'Previous series size different than previous tokens size.');
        address pool = ClonesUpgradeable.cloneDeterministic(address, bytes4(keccak256(_poolName)));
        emit PoolCreated(series, value);
    }
}