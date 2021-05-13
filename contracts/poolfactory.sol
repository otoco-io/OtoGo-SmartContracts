// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../node_modules/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../node_modules/@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

interface PoolInterface {
    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _poolName,
        string memory _metadata,
        address _sponsor
    ) external;
    function transferOwnership(address newOwner) external;
}

contract PoolFactory is OwnableUpgradeable {
    event PoolCreated(string indexed name, address pool);

    address private _poolSource;

    function initialize(address poolSource) external {
        _poolSource = poolSource;
    }

    function updateTokenContract(address newAddress) public onlyOwner {
        _poolSource = newAddress;
    }

    function createLaunchPool (
        address[] memory _allowedTokens,
        uint256[] memory _uintArgs,
        string memory _poolName,
        string memory _metadata
    ) external returns (address pool){
        pool = ClonesUpgradeable.cloneDeterministic(_poolSource, (keccak256(abi.encodePacked(_poolName))));
        PoolInterface(pool).initialize(_allowedTokens, _uintArgs, _poolName, _metadata, msg.sender);
        emit PoolCreated(_poolName, pool);
    }
}