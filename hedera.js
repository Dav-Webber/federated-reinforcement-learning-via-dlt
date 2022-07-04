/*
*
* this has functionality to connect to hedera and mirror nodes
*  via sending messages, creating topics and receiving messages via queue
*/

/*
* TODO LIST:
* 1- Test that queue doesnt store duplicated messages
*/






// allow us to grab our .env variables
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, 'config.env') });

// accessing queue functionality
const Queue = require('./queue.js');

// accessing web3storage functionality
const {Storage} =  require( './web3storage.js');

// import the 'Client' module from the Hedera JS SDK
const { Client, CryptoTransferTransaction, TopicCreateTransaction, TopicMessageSubmitTransaction, createReceipt, TopicMessageQuery } = require("@hashgraph/sdk");
const axios = require('axios');

// accessing federate functionality
const {Aggregation} = require('./federate.js');
//const { throws } = require('assert');

class Hedera{


    constructor(){

        //this.operatorAccount = process.env.ACCOUNT_ID;
        this.operatorAccount = '0.0.2151543';

        //this.operatorPrivateKey = process.env.PRIVATE_KEY;
        this.operatorPrivateKey = '302e020100300506032b657004220420ac5cd9402e9e365530faccb8b85670089fca8aec39228a621f3f5ba9258576d2';
        this.client = Client.forTestnet(); 

        this.client.setOperator(this.operatorAccount, this.operatorPrivateKey);

        this.client.setMirrorNetwork("hcs.testnet.mirrornode.hedera.com:5600")
        //change to TOPIC_ID when not in test

        //this.currentTopic = process.env.TEST_TOPIC_ID;
        this.currentTopic = '0.0.46844646';

        this.msgqueue = new Queue();
        this.storage = new Storage();
        //this will need to be initialized to save last maxsequence num from a local file or something
        this.maxsequencenum= 0;
        // initialise state for aggregation class here
        this.agg = new Aggregation();

        //this.currentStatusTopic = process.env.STATUS_TOPIC_ID;
        this.currentStatusTopic = '0.0.46034756';

        //does this constantly listen for new messages? and place them to msg queu
        //this.getMessagesFromSub();
        this.currentMax= 0;
        this.currentMaxMessage = null;
        // when train button is clicked, this should be value of worker user id from input
        this.user_worker_id = '';
        
        
    }


    async getHighestScoringMessageFromSubUsingAxios()
    {
        let url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${this.currentTopic}/messages/`;
        try {
            const response = await axios.get(url);  
            const items = response.data;
            const messages = items.messages;
            for (let element in messages)
            {
                let string_msg = Buffer.from(messages[element].message ,"base64").toString();
                let obj = JSON.parse(string_msg);
                let score = parseInt(obj.score);
                //maybe remove the second part of the if statement if all workers will use same operatoracc id
                //change this.operatorAccount for this.user_worker_id
                if (score > this.currentMax & obj.worker_id !== this.operatorAccount)
                {       
                    console.log(score)
                    this.currentMax = score;
                    this.currentMaxMessage = obj;
                }
            }       
            //return messages;
          } catch (errors) {
            console.error(errors);
          }
    }

//creates a topic and stores the current topic in current Topic
    async createTopic() {

        //Create the transaction
        const transaction = new TopicCreateTransaction();

        //Sign with the client operator private key and submit the transaction to a Hedera network
        const txResponse = await transaction.execute(this.client);

        //Request the receipt of the transaction
        const receipt = await txResponse.getReceipt(this.client);

        //Get the topic ID
        const newTopicId = receipt.topicId;
        //this.currentTopic = newTopicId;
        console.log("The new topic ID is " + newTopicId);
    }

    // compares local avg steps (reward, the more steps the better) with published steps on HCS
    // publishes to HCS and stores local model on web 3 ==> if avgSteps is greater than the highest step count stored on HCS
    // downloads the highest scoring (average steps) model by reading HCS message CID (web3 storage link) ==> if avgSteps is lower than highest step count stored on HCS
    async compareStepsWithLedger(avgSteps) {

        
        await this.getHighestScoringMessageFromSubUsingAxios();
        console.log(`recorded mean steps: ${avgSteps}, max steps on ledger: ${this.currentMax}`); 
        if (this.currentMaxMessage !== null || this.currentMax == 0)
        {
            
            if (avgSteps > this.currentMax)
            {        
                        
                console.log('getting Model Artifacts...');
                let modelArtifacts = await this.storage.getArtifacts();
                console.log('Model artifacts retrieved! See below: ');
                console.log(modelArtifacts);
                console.log('Uploading local model...');
                let new_cid = await this.storage.uploadLocalModel(modelArtifacts);
                console.log(`Uploaded with cid: ${new_cid} !`);
                if (new_cid !== null)
                {
                    console.log('Publishing new score..');
                    //change this.operatorAccount for this.user_worker_id
                    this.currentMaxMessage = await this.publishScore(new_cid, avgSteps, this.user_worker_id); // --> sends message with score and cid of weights file, step-score, worker acc id   
                    console.log('Published!');
                    this.currentMax = parseInt(this.currentMaxMessage.score);
                    console.log(`Current max score is now ${this.currentMax} !`);
                    return 0;
                }
                else
                {
                    console.log('new_cid is null, cant publish score to hedera!');
                    return -1;
                }   
                
                
                //test end
                // //ogcode
                // console.log('Uploading local high scoring model...');
                // // uploads Local Model to web 3 storage and returns a cid
                // let new_cid = await this.storage.uploadLocalModel(modelArtifacts);
                // console.log(`Uploaded with cid: ${new_cid} !`);
                // if (new_cid !== null)
                // {
                //     console.log('Publishing new score..');
                //     this.currentMaxMessage = await this.publishScore(new_cid, avgSteps, this.operatorAccount); // --> sends message with score and cid of weights file, step-score, worker acc id   
                //     console.log('Published!');
                //     this.currentMax = parseInt(this.currentMaxMessage.score);
                //     console.log(`Current max score is now ${this.currentMax} !`);
                //     return 0;
                // }
                // else
                // {
                //     console.log('new_cid is null, cant publish score to hedera!');
                //     return -1;
                // }   
                // //og code end         
            }
            if (avgSteps < this.currentMax)
            { 
                // cid received from json object
                let cid = this.currentMaxMessage.cid;
                console.log(`Downloading Global Model... for cid: ${cid}`);
                //change this if model topology changes
                //let json_cid = 'bafybeiec4ts367kzzgmenswa7elsoxbpum4iba4nk7sbz4fopdmocmo5ge';
                await this.storage.downloadGlobalModel(cid); // --> download and save global model to indexed db browser storage
                console.log('Global Model Downloaded!');
                let status_result = await this.publishWorkerStatus(0); // --> publishes status messages to hcs, EXAMPLE : Federate started for this worker
                console.log('Aggregating Models...');
                let federate_result = await this.agg.federateModels(); //--> averages this model with the downloaded model (use running average?) 
                // check that publish worker status and federate functions worked
                if (status_result == true & federate_result == true)  
                    {
                        await this.publishWorkerStatus(1); // --> publishes status messages to hcs, EXAMPLE : Federate complete for this worker
                        console.log('Aggregation Complete!')
                        return 1;
                    }  
                else
                {
                    console.log(`Error Aggregating, status message result: ${status_result}, federation result: ${federate_result}`);
                    return -1;
                } 
            }
        }
        else
        { 
            console.log('current max message is null atm');
            return -1; 
        }
    }


    //sends message to the current working topic
    // should send json as message, current reward, timestamp, id and cid to web3storage
    async sendMessage(message, topic)
    {
        await new TopicMessageSubmitTransaction({
            topicId: topic,
            message: message,
        }).execute(this.client);
    }

    // TODO: add functionality to publish worker updates to monitor all workers via status messages
    async publishWorkerStatus(num)
    {
        // Starting aggregation = 0 
        if (num == 0)
        {
            let status = 'Started';
            //change this.operatorAccount for this.user_worker_id
            let msgString = `{"worker_id": "${this.user_worker_id}", "status": "${status}"}`;
            await this.sendMessage(msgString, this.currentStatusTopic);
            console.log('message sent!');
            return true;
        }
        // aggregation complete = 1
        if ( num == 1)
        {
            let status = 'Completed';
            //change this.operatorAccount for this.user_worker_id
            let msgString = `{"worker_id": "${this.user_worker_id}", "status": "${status}"}`;
            await this.sendMessage(msgString, this.currentStatusTopic);
            console.log('message sent!');
            return true;
        }
        return false;
        

    }

    // should publish score, cid and worker_id to HCS topic
    async publishScore(cid, score, worker_id)
    {
        // string of json format ready for publishing to hcs
        let msgString = `{"cid": "${cid}", "score": ${score}, "worker_id": "${worker_id}"}`;
        await this.sendMessage(msgString, this.currentTopic);
        let obj = JSON.parse(msgString);
        return obj;
    }

    // get topic transactions via mirror node  WILL NOT NEED, USE getMessagesFromSub() INSTEAD!!
    // need to decrypt and store in database
    // async getMessagesFromMirrorNode()
    // {
        
    //     let res = await axios.get(`https://testnet.mirrornode.hedera.com/api/v1/topics/${this.currentTopic}/messages/`);
    //     //let res = await axios.get(`https://testnet.mirrornode.hedera.com/api/v1/accounts?account.id=${this.operatorAccount}`);

    //     let data = res.data;
    //     let all_msgs = data.messages.map(x => x.message)
    //     console.log(all_msgs);

    // }

    // retrieves all messages to topic with timestamp and sequence number and stores in queue/list
    async getMessagesFromSub()
    {
        console.log(`Listening to messages for topic: ${this.currentTopic}`);
        new TopicMessageQuery()
        .setTopicId(this.currentTopic)
        .setStartTime(0)
        .subscribe(
            this.client,
            (message) => console.log(Buffer.from(`\"message\": ${message.contents}\n\"timestamp\": ${message.consensusTimestamp}\n ${message.sequenceNumber}`, "utf8").toString())
            //(message) => message.sequenceNumber >= this.maxsequencenum ? (store message in a queue to be processed) msgqueuePush(message): do nothing
            // remember to buffer message contents to retrieve later when need to decode message
            //(message) => parseInt(message.sequenceNumber) > this.maxsequencenum ? this.msgqueuePush(message) : 0
        );

    }

    // return highest scoring message from subscription where the message read is not from current worker
    async getHighestScoringMessageFromSub()
    {
        console.log(`Listening to messages for topic: ${this.currentTopic}`);
        // let current_max=0;
        // let max_message = null;
        //console.log(this.currentTopic);
        //console.log(this.client);
        
        new TopicMessageQuery()
        .setTopicId(this.currentTopic)
        .setStartTime(0)
        .subscribe(
            this.client,
            //(message) => console.log(Buffer.from(`\"message\": ${message.contents}\n\"timestamp\": ${message.consensusTimestamp}\n ${message.sequenceNumber}`, "utf8").toString())
            //(message) => message.sequenceNumber >= this.maxsequencenum ? (store message in a queue to be processed) msgqueuePush(message): do nothing
            // remember to buffer message contents to retrieve later when need to decode message
            //(message) => parseInt(message.sequenceNumber) > this.maxsequencenum ? this.msgqueuePush(message) : 0
            (message) => {
                let string_msg = Buffer.from(message.contents ,"utf8").toString();
                let obj = JSON.parse(string_msg);
                let score = parseInt(obj.score);
                //console.log(obj.score);
                // let max = JSON.parse(Buffer.from(message.contents ,"utf8").toString());
                // console.log(max);
                if (score > this.currentMax & obj.worker_id !== this.operatorAccount)
                {       
                    this.currentMax = score;
                    this.currentMaxMessage = obj;
                }
                //return this.currentMax;
            }  
       

        );

        //setTimeout(() => {  console.log(this.currentMax); }, 5000);
        

    }

    //function to push message to queue, and update maxsequence num value
    msgqueuePush(message)
    {
        this.msgqueue.enqueue(message);
        this.maxsequencenum = parseInt(message.sequenceNumber);
        //console.log(this.msgqueue.length);
        console.log('msg pushed!');
    }


    //




}
module.exports = { Hedera }

// needs to be exported so other js files can use and remove below
//let h = new Hedera();

//h.sendMessage("Hex me");
//h.getMessagesFromSub();

//h.publishScore("XXXXXXXX", 50, "Test-ACC");

//retrieves messages from Queue with a delay. WORKS!
//setTimeout(() => {  console.log(Buffer.from(h.msgqueue.items[0].contents, "utf8").toString()); }, 5000);




////create new topic
//h.createTopic();




