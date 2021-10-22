// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../node_modules/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../node_modules/@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

interface PoolInterfaceV2 {
    function initialize(
        address[] memory allowedTokens,
        uint256[] memory uintArgs,
        string memory _metadata,
        address _sponsor,
        address _shares,
        address _curve
    ) external;
}

interface IMasterRegistry {
    function setRecord(address series, uint16 key, address value) external;
}

contract PoolFactoryV2 is OwnableUpgradeable {
    event PoolCreated(address indexed sponsor, address pool, string metadata);
    event UpdatedPoolSource(address indexed newSource);
    event AddedCurveSource(address indexed newSource);
    event UpdatedRegistry(address indexed newAddress);
    address private _poolSource;
    address[] private _curveSources;
    address private _registryContract;

    modifier onlySeriesOwner(address _series) {
        require(OwnableUpgradeable(_series).owner() == _msgSender(), "Error: Only Series Owner could deploy tokens");
        _;
    }

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
    function updateRegistry(address newAddress) public onlyOwner {
        _registryContract = newAddress;
        emit UpdatedRegistry(newAddress);
    }

    function createLaunchPool (
        address[] memory _allowedTokens,
        uint256[] memory _uintArgs,
        string memory _metadata,
        address _shares,
        uint16 _curve,
        address _series
    ) external onlySeriesOwner(_series) returns (address pool){
        pool = ClonesUpgradeable.clone(_poolSource);
        PoolInterfaceV2(pool).initialize(_allowedTokens, _uintArgs, _metadata, msg.sender, _shares, _curveSources[_curve]);
        if (_registryContract != address(0)){
            IMasterRegistry(_registryContract).setRecord(_series, 3, address(pool));
        }
        emit PoolCreated(msg.sender, pool, _metadata);
    }
}