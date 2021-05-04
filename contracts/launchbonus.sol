// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

struct StakeBonus {
    uint256 current;
    uint256 total;
    uint bonus;
}

contract LaunchBonus is Ownable {

    event BonusAdded(uint256 amount, uint8 bonus);
    event AmountDrained(uint256 amount, uint8 bonus)

    StakeBonus[] bonusLevels;

    public addBonus(uint256 _amount, uint _bonus) external onlyOwner {
        bonusLevels.push(StakeBonus(_amount, _amount, _bonus))
        emit BonusAdded(_amount, _bonus)
    }

    public drainAmount(uint256 _amount) external onlyOwner returns (uint256[] memory resultBonuses){
        uint cut = 0;
        for (uint i=0; i<bonusLevels.length; i++){
            cut = min(bonusLevels[i].amount, _amount);
            if (cut > 0){
                _amount -= cut;
                bonusLevels[i].amount -= cut;
                resultBonuses.push(cut);
                resultBonuses.push(bonusLevels[i].bonus);
                emit AmountDrained(cut, bonusLevels[i].bonus)
            }
        }
        return resultBonuses
    }

}