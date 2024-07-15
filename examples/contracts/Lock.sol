// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

contract Lock {
    uint public unlockTime;
    address payable public owner;
    IERC20 public token;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime, IERC20 _token) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        token = _token;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        uint to_withdraw = token.balanceOf(address(this));
        emit Withdrawal(to_withdraw, block.timestamp);
        token.transfer(msg.sender, to_withdraw);
    }
}
