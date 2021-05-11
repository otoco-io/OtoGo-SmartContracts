// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LaunchBonus is Ownable {
    using SafeMath for uint256;

    event BonusAdded(uint256 amount, uint bonus);
    event AmountDrained(uint256 amount, uint bonus);

    /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    struct StakeBonus {
        uint256 current;
        uint256 total;
        uint bonus;
    }

    StakeBonus[] bonusLevels;

    function addBonus(uint256 _amount, uint _bonus) external onlyOwner {
        bonusLevels.push(StakeBonus(_amount, _amount, _bonus));
        emit BonusAdded(_amount, _bonus);
    }

    function drainAmount(uint256 _amount) external onlyOwner returns (uint256[] memory){
        uint cut = 0;
        uint256 currentAmount = _amount;
        uint256[] memory resultBonuses = new uint256[](bonusLevels.length*2);
        for (uint i = 0; i < bonusLevels.length; i ++){
            cut = min(bonusLevels[i].current, currentAmount);
            if (cut > 0){
                currentAmount -= cut;
                bonusLevels[i].current -= cut;
                resultBonuses[i*2] = cut;
                resultBonuses[i*2 + 1] = bonusLevels[i].bonus;
                emit AmountDrained(cut, bonusLevels[i].bonus);
            }
        }
        return resultBonuses;
    }

}