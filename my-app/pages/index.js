import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import styles from '../styles/Home.module.css'
import { BigNumber, Contract, providers, utils } from "ethers"
import web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS
} from "../constants"

export default function Home() {
  //创造一个大数字（0）
  const zero = BigNumber.from(0);
  //跟踪用户钱包是否被连接
  const [walletConnected, setWalletConnected] = useState(false);
  //通过签名地址获取合约的所有者
  const [isOwner, setIsOwner] = useState(false);
  //跟踪是否在加载
  const [loading, setLoading] = useState(false);
  //用户想要铸造的代币数量
  const [tokenAmount, setTokenAmount] = useState(zero);
  //跟踪一个地址的代币数量
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  //tokensMinted是到现在为止已铸造的代币总数
  const [tokensMInted, setTokensMinted] = useState(zero);
  //跟踪可以申领的代币数量
  //基于用户持有Crypto Dev NFT ,他们还没有申领token
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero)
  //创建一个执行WEB3Modal(用于连接钱包)的引用，只要页面打开，他就一直存在
  const web3ModalRef = useRef();

  /**
   * getTOkenToBeClaimed: 查看可认领代币余额
   */
  const getTokenToBeClaimed = async () => {
    try {
      //无需签名，获取拥有者
      const provider = await getProviderOrSigner();
      //实例nft的合约
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      //实例token的合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //使用签名者提取当前连接的钱包账户地址
      const signer = await getProviderOrSigner(true);
      //获取与连接到钱包的签名者关联的地址
      const address = await signer.getAddress();
      //调用NFT合约的balanceOf函数来获取用户所持有的NFT合约的数量
      const balance = await nftContract.balanceOf(address);
      //balance是一个大数字，因此我们将其和大数字zero进行比较
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        //跟踪为认领的代币数量
        var amount = 0;
        //遍历所有NFT，检查代币是否已经被认领
        //只有在没有认领代币的情况下才增加金额
        //一个NFT(给定的代币)
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }
        //tokensaToBeClaimed已经初始化为一个大数字，因此我们要转换数量
        //得到大数字，然后设置它的值
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };

  /**
   * getBalanceOfCryptoDevTokens: 查看用户持有代币余额
   */
  const getBalanceOfCryptoDevTokens = async () =>{
    try {
      //获取拥有者，无需签名
      const provider = await getProviderOrSigner();
      //实例token合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //调用签名者获取当前连接钱包的地址
      const signer = await getProviderOrSigner(true);
      //获取连接钱包的签名者的关联地址
      const address = await signer.getAddress();
      //从token合约带哦用balanceOf函数来获取用户持有的代币数量
      const balance = await tokenContract.balanceOf(address);
      //balance本身就是一个大数字，所有我们不需要在设置它之前转换它
      setBalanceOfCryptoDevTokens(balance);

    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  }

  /**
   * 
   * mintcryptoDevToken: 铸造代币
   */
  const mintCryptoDevToken = async (amount) =>{
    try {
      //获取签名者，需要写的事务
      const signer = await getProviderOrSigner(true);
      //实例toekn合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      //每个代币为0.001ether,我们需要发送的值是0.001*amount
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount,{
        //value表示一个代币的成本，为0.001ether
        //我们使用ether.js中的utils库将0.001字符串解析为ether;
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      //等待交易被加载
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully minted Crypto Dev Tokens");
      //查看代币余额
      await getBalanceOfCryptoDevTokens();
      //查看总供应已铸造的代币
      await getTotalTokensMinted(); 
      //查看已认领的代币
      await getTokenToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  }
  
  /**
   * 认领代币
   */
  const claimCryptoDevTokens = async () => {
    try {
      //获取签名者，需要签名
      const signer = await getProviderOrSigner(true);
      //实例token合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      //调用token合约的claim()函数
      const tx = await tokenContract.claim();
      setLoading(true);
      //等待交易被加载
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokenToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * getTotalTokensMinted:检查到目前为止在总供应中已经铸造了多少代币
   */
  const getTotalTokensMinted = async () => {
    try {
      //获取拥有者，只读
      const provider = await getProviderOrSigner();
      //实例token合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //获取所有已铸造的代币
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   *getOwner: 通过连接地址获取合约所有者
   */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      //从合约中带哦用所有者的函数
      const _owner = await tokenContract.owner();
      //我们让签名者提供当前连接的钱包账户的地址
      const signer = await getProviderOrSigner(true);
      //获取与连接到钱包的签名者关联的地址
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   *withdrawCoins: 提取代币
   */
  const withdrawCoins = async () => {
    try {
      //要用户签名
      const signer = await getProviderOrSigner(true);
      //实例合约
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      //调用合约的withdraw函数
      const tx = await tokenContract.withdraw();
      //等待加载
      setLoading(true);
      await tx.wait();
      //加载完成后获取合约所有者
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * 返回provider（拥有者） 或signer（签名者）
   * 
   * 拥有者与区块链交互--读取事务、读取余额、读取状态等
   * 
   * 签名者是特殊类型的拥有者，用于需要向区块链进行写的事务，这涉及到连接的账户
   * 需要进行数字签名来授权发送的交易，钱包就公开一个签名的API，
   * 允许你的网站用签名者来请求用户签名
   * @param {*} needSigner 如果你需要签名者，则为true,否则默认为false 
   */
  const getProviderOrSigner = async (needSigner = false) => {
    //连接到钱包
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider)

    //如果用户没有连接到对应的网络，让他们知道并抛出一个错误
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("change the network to Rinkeby");
      throw new Error("change the network to Rinkeby");
    }

    //如果需要签名返回签名者
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    //如果不需要签名返回拥有者
    return web3Provider;
  };

  /**
   *connectWallet: 连接钱包
   */
  const connectWallet = async () => {
    try {
      //第一次使用，提示用户连接钱包
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * useEffect()是对网站状态的变化做出反应
   * 最后的数组表示的是哪些状态变化会触发此效果
   * 当前是指只要walletConnected的值发生变化，这个效果就会被带调用
   */
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      })
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokenToBeClaimed();
      withdrawCoins();
    }
  }, [walletConnected]);

  /**
   * 
   * renderButton: 根据dapp的状态返回一个按钮
   */
  const renderButton = () => {
    //如果我们在等待，返回一个加载的按钮
    if(loading){
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }

    //如果连接到所有者，则调用提币
    if(walletConnected && isOwner){
      return (
        <div>
          <button className= {styles.button} onClick={withdrawCoins}>
            Withdraw Coins
          </button>
        </div>
      );
    }

    //如果要认领的代币大于0 ，则返回认领按钮
    if(tokensToBeClaimed > 0){
      return(
        <div>
          <div className={styles.descrition}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }

    //如果用户没有任何代币要认领，返回铸造按钮
    return(
      <div style={{display: "flex-col"}}>
        <div>
          <input 
            type="number"
            placeholder='Amount of Tokens'
            //BigNUmber.from 转换成e.target.value转换成为一个BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
            />
        </div>

        <button
         className={styles.button}
         disabled={!(tokenAmount)>0}
         onClick={() => mintCryptoDevToken(tokenAmount)}
         >
          Mint Tokens
         </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name='descrition' content='ICO-Dapp' />
        <link rel='icon' href='/favcion.ico' />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>
            Welcome to Crypto Devs Ico!
          </h1>
          <div className={styles.descrition}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {/*通过walletConnected钱包是否连接的两种状态 三元运算符*/}
          {walletConnected ? (
            <div>
              <div className={styles.descrition}>
                {/*formatEther 是帮助我们将大数字转换成字符*/}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
              </div>
              <div className={styles.descrition}>
                Overall {utils.formatEther(tokensMInted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with😼 by Crypto Devs
      </footer>
    </div>
  );
}
