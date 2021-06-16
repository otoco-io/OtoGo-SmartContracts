// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../node_modules/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../node_modules/@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

interface PoolInterface {
    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _metadata,
        address _sponsor,
        address _shares,
        address _curve
    ) external;
}

contract PoolFactory is OwnableUpgradeable {
    event PoolCreated(address indexed sponsor, address pool, string metadata);
    event UpdatedPoolSource(address indexed newSource);
    event AddedCurveSource(address indexed newSource);
    address private _poolSource;
    address[] private _curveSources;

    function initialize(address poolSource, address curveSource) external {
        __Ownable_init();
        _poolSource = poolSource;
        _curveSources.push(curveSource);
    }

    function updatePoolSource(address newAddress) public onlyOwner {
        _poolSource = newAddress;
        emit UpdatedPoolSource(newAddress);
    }
    function addCurveSource(address newAddress) public onlyOwner {
        _curveSources.push(newAddress);
        emit AddedCurveSource(newAddress);
    }

    function createLaunchPool (
        address[] memory _allowedTokens,
        uint256[] memory _uintArgs,
        string memory _metadata,
        address _shares,
        uint16 _curve
    ) external returns (address pool){
        pool = ClonesUpgradeable.clone(_poolSource);
        PoolInterface(pool).initialize(_allowedTokens, _uintArgs, _metadata, msg.sender, _shares, _curveSources[_curve]);
        emit PoolCreated(msg.sender, pool, _metadata);
    }
}