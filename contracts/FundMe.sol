//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PriceConverter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

//keyword - constant and immutable those variables cannot be changed and gas fees will be smaller
//Constant is the same as macro in language C

error FundMe__NotOwner(); //Custom errors, those makes gas fees smaller, cause instead of keeping an error string in the memory

// we simply store a variable of error

/** @title A contract for crowd funding
 *  @author Adam Kattan
 *  @notice This contract is a demo.
 *  @dev This implements price feed to our library
 */

contract FundMe {
    uint256 public constant MINIMUM_USD = 50 * 1e18;
    using PriceConverter for uint256;

    AggregatorV3Interface private sPriceFeed;

    address[] private sFunders;
    mapping(address => uint256) private sAddressToAmountFunded;

    address private immutable iOwner;

    modifier onlyOwner() {
        //require(msg.sender == iOwner, "You cant't withdraw !");
        if (msg.sender != iOwner) {
            revert FundMe__NotOwner();
        }
        _; //the underscore means when will the rest of the code happen
    }

    constructor(address priceFeed) {
        //called when we deploy this contract
        iOwner = msg.sender;
        sPriceFeed = AggregatorV3Interface(priceFeed);
    }

    /*receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }*/

    /**
     *  @notice This function funds this contract.
     *  @dev This implements price feed to our library.
     */

    function fund() public payable {
        //Smart contract can hold funds same as wallets
        require(
            msg.value.getConversionRate(sPriceFeed) >= MINIMUM_USD,
            "Did not send enough!"
        ); //1 parametr = X => vykonani druheho parametru, a zaroven se prerusi transakce
        sFunders.push(msg.sender);
        console.log("New funder %s", msg.sender);
        sAddressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (
            uint256 founderIndex = 0;
            founderIndex < sFunders.length;
            founderIndex++
        ) {
            //nulovani mapy
            address addressFounder = sFunders[founderIndex];
            sAddressToAmountFunded[addressFounder] = 0;
        }

        sFunders = new address[](0); //reseting array
        //call
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed!");

        /*//transfer
        payable(msg.sender).transfer(address(this).balance);

        //send
        bool success = payable(msg.sender).send(address(this).balance);
        require(success, "Too much gas fee! Send failed!");*/
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory funders = sFunders;
        for (uint256 funderI = 0; funderI < funders.length; funderI++) {
            address funder = funders[funderI];
            sAddressToAmountFunded[funder] = 0;
        }
        sFunders = new address[](0);
        (bool success, ) = iOwner.call{value: address(this).balance}("");
        require(success);
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return sPriceFeed;
    }

    function getOwner() public view returns (address) {
        return iOwner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return sFunders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return sAddressToAmountFunded[funder];
    }
}
