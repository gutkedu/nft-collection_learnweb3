import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { providers, Contract } from "ethers";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS } from "../constants";

export default function Home() {
  const [isOwner, setIsOwner] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();

  const getOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      //Get an instance of your NFT contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      );
      const owner = await nftContract.owner();
      const userAddress = await signer.getAddress();

      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      );
      const txn = await nftContract.startPresale();
      await txn.wait();
      setPresaleStarted(true);
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      //Get an instance of your NFT contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      //This will return a BigNumber because presaleEnded is uint256
      //Will return a timestamp in seconds
      const presaleEndTime = await nftContract.presaleEnded();
      const currentTimeInSeconds = Date.now() / 1000;
      const hasPresaleEnded = presaleEndTime.lt(
        Math.floor(currentTimeInSeconds)
      );
      setPresaleEnded(hasPresaleEnded);
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfPresaleStarted = async () => {
    try {
      const provider = await getProviderOrSigner();
      //Get an instance of your NFT contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      const isPresaleStarted = await nftContract.presaleStarted();
      setPresaleStarted(isPresaleStarted);
      return isPresaleStarted;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    //Gain access to the provider/signer from metamask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    //if the user is not on rinkeby, tell them to switch to rinkeby
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please switch to the Rinkeby network");
      throw new Error("Incorrect network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  const onPageLoad = async () => {
    connectWallet();
    await getOwner();
    const presaleStarted = await checkIfPresaleStarted();
    if (presaleStarted) {
      await checkIfPresaleEnded();
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      onPageLoad();
    }
  }, []);

  function renderBody() {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your Wallet
        </button>
      );
    }
    if (isOwner && !presaleStarted) {
      //render button to start the presale
      return (
        <button onClick={startPresale} className={styles.button}>
          Start Presale
        </button>
      );
    }

    if (!presaleStarted) {
      //just say that presale hasnt started yet, come back later
      return (
        <div>
          <span className={styles.description}>
            Presale has not started yet. Come back later!
          </span>
        </div>
      );
    }

    if (presaleStarted && !presaleEnded) {
      //allow users to mint in presale
      //they need to be in whitelist for this to work
      return (
        <div>
          <span className={styles.description}>
            Presale has started! If your address is whitelisted, you can mint a
            CryptoDev!
          </span>
          <button className={styles.button}> Presale Mint</button>
        </div>
      );
    }

    if (presaleEnded) {
      //allow users to take part in public sale
      return (
        <div>
          <span className={styles.description}>
            Presale has ended. You can mint a CryptoDev in public sale, if any
            remain.
          </span>
          <button className={styles.button}> Public Mint</button>
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>Crypto Devs NFT</title>
      </Head>

      <div className={styles.main}>{renderBody()}</div>
    </div>
  );
}
