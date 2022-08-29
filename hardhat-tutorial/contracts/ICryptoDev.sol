// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICryptoDevs{
    /**
    *在代币列表的给的索引到持有代币的拥有者的代币ID
    *跟（balanceOF）一起使用，枚举所有的拥有者的代币
     */
    function tokenOfOwnerByIndex(address owner, uint index) external view returns(uint256 tokenId);

    /**
    *返回拥有者的代币数量
     */
    function balanceOf(address owner)external view returns(uint256 balance);
    
   
}