const { Gateway, Wallets, TxEventHandler, GatewayOptions, DefaultEventHandlerStrategies, TxEventHandlerFactory } = require('fabric-network');
const fs = require('fs');
const EventStrategies = require('fabric-network/lib/impl/event/defaulteventhandlerstrategies');
const path = require("path")
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util')

const helper = require('./helper');
const query = require('./query');

const { blockListener, contractListener } = require('./Listeners');
const channelName = "mychannel"
const chaincodeName = "fabcar"


const invokeTransaction = async (fcn,username,args) => {
    try {
        let org_name
        if(fcn === "CreateCSP" || fcn === "UpdateCSP" || fcn === "DeleteCSP"){
            org_name = "Org1"
        }
        else {
            org_name = "Org2"
        }
        const ccp = await helper.getCCP(org_name);

        const walletPath = await helper.getWalletPath(org_name);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        let identity = await wallet.get(username);
        if (!identity) {
            console.log(`An identity for the user ${username} does not exist in the wallet, so registering user`);
            return;
        }

        const connectOptions = {
            wallet, identity: username, discovery: { enabled: true, asLocalhost: true }
            // eventHandlerOptions: EventStrategies.NONE
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, connectOptions);

        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // await contract.addContractListener(contractListener);
        // await network.addBlockListener(blockListener);

        // Multiple smartcontract in one chaincode
        let result;
        let err;
        let message;
        let response;

        switch (fcn) {
            case "CreateCSP":
            case "UpdateCSP":
            case "CreateSubscriberSim":
            case "UpdateSubscriberSim":
                console.log(`User name is ${username}`)
                console.log(JSON.stringify(args));
                result = await contract.submitTransaction('SmartContract:'+fcn, JSON.stringify(args));
                result = {txid: result.toString()}
                break;

            case "DeleteCSP":
            case "DeleteSubscriberSim":
            case "discovery":
            case "authentication":
            case "VerifyUser":
                console.log(`User name is ${username}`)
                await contract.submitTransaction('SmartContract:'+fcn,username);
                return;

            case "MoveSim":
            case "UpdateRate":
                console.log(`User name is ${username}`)
                await contract.submitTransaction('SmartContract:'+fcn,username,args);
                return;

            default:
                break;
        }

        await gateway.disconnect();

        // result = JSON.parse(result.toString());

        response = {
            message: message,
            result
        }

        return response;


    } catch (error) {

        console.log(`Getting error: ${error}`)
        return error.message

    }
}

exports.invokeTransaction = invokeTransaction;