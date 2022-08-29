const { ethers } = require("hardhat");
require("dotenv").config({path:".env"});
const{ CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } = require("../constants");

async function main(){
  //上个模板中部署的Crypto Devs NFT合约的地址
  const cryptoDevsNFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;
  
  //合约实例工厂，新的合约，现在这个模板的合约
  const cyptoDevsTokenContract = await ethers.getContractFactory("CryptoDevToken");
  
  //部署合约
  const deployedCryptoDevsTokenContract = await cyptoDevsTokenContract.deploy(
    cryptoDevsNFTContract
  );
  
  //打印合约地址
  console.log(
    "Crypto Devs Token Contract Address:",
    deployedCryptoDevsTokenContract.address
  );
}

//调用main函数，捕获任何错误
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(error);
    process.exit(1);
  } )
