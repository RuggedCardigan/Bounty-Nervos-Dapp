/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';
import { BossFightWrapper } from '../lib/contracts/BossFightWrapper';
import * as CompiledContractArtifact from '../../build/contracts/ERC20.json';
import { CONFIG } from '../config';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<BossFightWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [ckETHBalance, setCKETHBalance] = useState<number>();
    const [layer2DepositAddress, setLayer2DepositAddress] = useState<string | undefined>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [lives, setLives] = useState<number | undefined>();
    const [bossHealth, setBossHealth] = useState<number | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [newLifeCountInputValue, setNewLifeCountInputValue] = useState<
        number | undefined
    >();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (polyjuiceAddress && accounts && web3) {
            getCKETHBalance();
        }
    }, [polyjuiceAddress, accounts, web3]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);



    const account = accounts?.[0];
    const ckETHAddress = '0x832630fAa22638694403255a9789aE67ACDFc828';

    async function getCKETHBalance() {
        const _contractCketh = new web3.eth.Contract(
            CompiledContractArtifact.abi as any,
            ckETHAddress
        );
        const ckBalance = Number(await _contractCketh.methods.balanceOf(polyjuiceAddress).call({from: accounts?.[0]}));
        setCKETHBalance(ckBalance);
    }

    async function reloadBalance() {
        setCKETHBalance(undefined);
        const l2Balancewow = BigInt(await web3.eth.getBalance(account));
        setL2Balance(l2Balancewow);
        await getCKETHBalance();
    }

    async function deployContract() {
        const _contract = new BossFightWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            const transactionHash = await _contract.deploy(account);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to set your current amount of lives.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function getBossHealth() {
        const value = await contract.getBossHealth(account);
        toast('Successfully got the boss current health!', { type: 'success' });

        setBossHealth(value);
    }

    async function getLives() {
        const value = await contract.getMyLives(account);
        toast('Successfully got your current life!', { type: 'success' });

        setLives(value);
    }

    async function Attack() {
        try{
            setTransactionInProgress(true);
        await contract.attackBoss(account);
        toast('Successfully attackted the Boss!', {type: 'success'});
        }
        catch (error) {
            console.error(error);
            toast.error('You are either dead or the boss is dead. Deploy new Contract.')
        } finally {
            setTransactionInProgress(false);
        }
    }

    const getLayer2DepositAddress = async () => {
        const addressTranslator = new AddressTranslator();

        const _depositAddress = await addressTranslator.getLayer2DepositAddress(web3,accounts?.[0]);
        setLayer2DepositAddress(_depositAddress.addressString);
    };

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new BossFightWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setLives(undefined);
    }

    async function setNewLifeCount() {
        try {
            setTransactionInProgress(true);
            await contract.setLives(newLifeCountInputValue, account);
            toast(
                'Successfully set new life count.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
                const _contractCketh = new _web3.eth.Contract(
                    CompiledContractArtifact.abi as any,
                    ckETHAddress
            );
        const ckBalance = Number(await _contractCketh.methods.balanceOf(polyjuiceAddress).call({from: _accounts[0]}));
        setCKETHBalance(ckBalance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br/>
            <br/>
            ckETH Balance:
            <b>{ckETHBalance ? ckETHBalance.toString() : <LoadingIndicator/>} ckETH WEI </b>
            <br />
            <br />
            <button onClick={reloadBalance}>Reload Bal</button>
            <br />
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            Deploy transaction hash: <b>{deployTxHash || '-'}</b>
            <br />
            <button onClick={deployContract} disabled={!l2Balance}>
                Deploy contract
            </button>
                        &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br/>
            <br/>
            <input
                type="number"
                onChange={e => setNewLifeCountInputValue(parseInt(e.target.value, 10))}
            />
            <button onClick={setNewLifeCount} disabled={!contract}>
                Set new life count.
            </button>
            <br/>
            <p>
                The button deploys a boss fight contract, which initiates a fight.
                <br/>
                We recommend you set your life count to 10! Maybe lower if your feeling lucky!
                <br />
                You deal either 1 or 3 damage to the boss depending on chance and boss deals 2 damage to you.
            </p>
            <br/>
            <button onClick={getBossHealth} disabled={!contract}>
                Get  boss's current health.
            </button>
            {bossHealth ? <>&nbsp;&nbsp;Boss Life count: {bossHealth.toString()}</> : null}
            <br />
            <br />
            <button onClick={getLives} disabled={!contract}>
                Get current life count.
            </button>
            {lives ? <>&nbsp;&nbsp;Your Life Count: {lives.toString()}</> : null}            
            <br />
            <br />
            <button onClick={Attack} disabled={!contract}>
                Attack the Boss!
            </button>
            <br />
            <br />
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            <button onClick={getLayer2DepositAddress}>Click to get Layer 2 Address</button>
            <br />
            <br />
            {layer2DepositAddress && (
            <div>
            {' '}
            <p>
            {layer2DepositAddress}
            </p>
            <br />
            <br />
            Enter your Layer 2 deposit address as the receipient in the link below.
            <br/>
            <br/>
            <button onClick={() => window.open('https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000', '_blank')}>
            The Force Bridge
            </button>
            </div>
            )}
            <br />
            <br />
            <br />
            <br />
            <ToastContainer />
        </div>
    );
}
