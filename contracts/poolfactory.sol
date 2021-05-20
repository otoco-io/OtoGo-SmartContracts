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
    function transferOwnership(address newOwner) external;
}

contract PoolFactory is OwnableUpgradeable {
    event PoolCreated(string indexed name, address pool);

    address private _poolSource;
    address[] private _curveSources;

    function initialize(address poolSource, address curveSource) external {
        _poolSource = poolSource;
        _curveSources.push(curveSource);
    }

    function updateTokenContract(address newAddress) public onlyOwner {
        _poolSource = newAddress;
    }
    function addCurveSource(address newAddress) public onlyOwner {
        _curveSources.push(newAddress);
    }

    function createLaunchPool (
        address[] memory _allowedTokens,
        uint256[] memory _uintArgs,
        string memory _metadata,
        address _shares,
        uint16 _curve
    ) external returns (address pool){
        pool = ClonesUpgradeable.cloneDeterministic(_poolSource, (keccak256(abi.encodePacked(_metadata))));
        PoolInterface(pool).initialize(_allowedTokens, _uintArgs, _metadata, msg.sender, _shares, _curveSources[_curve]);
        emit PoolCreated(_metadata, pool);
    }
}