import Web3 from 'web3';
import * as BossFightJSON from '../../../build/contracts/BossFight.json';
import { BossFight } from '../../types/BossFight';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class BossFightWrapper {
    web3: Web3;

    contract: BossFight;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(BossFightJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getBossHealth(fromAddress: string) {
        const data = await this.contract.methods.getBossHealth().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async getMyLives(fromAddress: string) {
        const data = await this.contract.methods.getMyLives().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async setLives(value: number, fromAddress: string) {
        const tx = await this.contract.methods.setLives(value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            value
        });

        return tx;
    }

    async attackBoss(fromAddress: string) {
        const tx = await this.contract.methods.Attack().send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const tx = this.contract
            .deploy({
                data: BossFightJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress
            });

        let transactionHash: string = null;
        tx.on('transactionHash', (hash: string) => {
            transactionHash = hash;
        });

        const contract = await tx;

        this.useDeployed(contract.options.address);

        return transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
