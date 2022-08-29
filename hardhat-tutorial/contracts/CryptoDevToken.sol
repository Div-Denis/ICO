// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICryptoDev.sol";

contract CryptoDevToken is ERC20, Ownable{

    //一个CD代币的价格
    uint256 public constant tokenPrice = 0.001 ether;
    //每个NFT会给用户10个代币
    //它需要表示为10*（10**18），因为ERC20代币由代币可能的最小面额表示
    //默认情况下，ERC20代币的最小面额为10^(-18)，这表示，余额为1
    //实际就等于（10^-18）个标记
    //考虑到小数位，拥有1个完整代币就相当于拥有（10^18）个代币
    uint256 public constant tokensPerNFT = 10 * 10**18;
    //CD币总供应量是10000
    uint256 public constant maxTotalSupply = 10000 * 10**18;
    //ICryptoDevs合约的实例化
    ICryptoDevs CryptoDevsNFT;
    
    //映射跟踪哪些代币ID已被认领
    mapping(uint256 => bool) public tokenIdsClaimed;


    constructor(address _cryptoDevContract) ERC20("Crypto Dev Token", "CD"){
        CryptoDevsNFT = ICryptoDevs(_cryptoDevContract);
    }

    /**
    *@dev CD币的铸造、总数和序号
    *需求
    * msg.value 应该是大于或等于 tokenprice * amount
     */
    function mint(uint256 amount) public payable {
        //以太币的价格应该大于或等于tokenPrice * amount
        uint _requiredAmount = tokenPrice * amount;
        require(msg.value >= _requiredAmount,"Ether sent is incorrect");
        //总代币（totalsupply） + 总数(amount) <= 10000,否则还原交易
        uint256 amountWithDecimals = amount * 10**18;
        require(
            (totalSupply() + amountWithDecimals) <= maxTotalSupply,
            "Exceeds the max total supplly available"
        );
        //调用Openzeppelin的ERC20契约的内部函数
        _mint(msg.sender, amountWithDecimals);
    }
    
    /**
    *@dev 基于发件人持有的NFT数量来铸币
    *  需求：
    * 发送人用户的Crypto Dev NFT 的数量应该大于0
    * 不应为发送人拥有的所有NFT认领代币
     */
    function claim() public {
        address sender = msg.sender;
        //获取给定发送人地址持有的CryptoDev NFT 数量
        uint256 balance = CryptoDevsNFT.balanceOf(sender);
        //如果余额为0 ，则恢复交易
        require(balance > 0 ,"You dont own any Crypto Dev NFT's");
        //跟踪无人认领的代币数量
        uint256 amount = 0 ;
        //遍历余额，并在它给定的索引出获得发送方拥有的代币ID
        for(uint256 i = 0 ; i<balance; i++){
            uint256 tokenId = CryptoDevsNFT.tokenOfOwnerByIndex(sender, i);
            //如果tokenID没有被认领，则增加金额
            if(!tokenIdsClaimed[tokenId]){
               amount += 1;
               tokenIdsClaimed[tokenId] = true;
            }  
        }
        //如果所有的代币ID都被认领，则恢复交易
        require(amount > 0, "You have already claimed all the tokens");
        //调用Openzeppelin的ERC20契约的内部函数
        //为每个NFT铸币（金额*10）
        _mint(msg.sender, amount * tokensPerNFT);
    }

   /**
   *@dev 提取所有发送到合约的EHT和代币
   * 需求
   * 连接的钱包必须是所有者的地址
   */
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent,) = _owner.call{value:amount}("");
        require(sent,"Failed to send Ether");
    }
    
    //msg.data为空，接收以太信息
    receive() external payable{}
    //msg.data不为空，返回函数
    fallback() external payable{}
}