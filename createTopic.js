const { Client, CryptoTransferTransaction, TopicCreateTransaction, TopicMessageSubmitTransaction, createReceipt, TopicMessageQuery } = require("@hashgraph/sdk");
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, 'config.env') });
class CreateTopic {

constructor(){

    this.operatorAccount = process.env.ACCOUNT_ID;
    this.operatorPrivateKey = process.env.PRIVATE_KEY;
    this.client = Client.forTestnet(); 
    this.client.setOperator(this.operatorAccount, this.operatorPrivateKey);
    this.client.setMirrorNetwork("hcs.testnet.mirrornode.hedera.com:5600"); 
    this.currentTopic = process.env.TEST_TOPIC_ID;  
    //this.currentTopic = null;
}

async createTopic() {

    //Create the transaction
    const transaction = new TopicCreateTransaction();

    //Sign with the client operator private key and submit the transaction to a Hedera network
    const txResponse = await transaction.execute(this.client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(this.client);

    //Get the topic ID
    this.currentTopic = receipt.topicId;
    //this.currentTopic = newTopicId;
    console.log("The new topic ID is " + this.currentTopic);
    
}

async sendMessage(message, topic)
    {
        await new TopicMessageSubmitTransaction({
            topicId: topic,
            message: message,
        }).execute(this.client);
    }


// should publish score, cid and worker_id to HCS topic
async publishScore(cid_value, score_value, worker_id_value)
{
    // string of json format ready for publishing to hcs
    const obj = {cid: cid_value, score: score_value, worker_id: worker_id_value};
    let msgString = JSON.stringify(obj);
    await this.sendMessage(msgString, this.currentTopic);
    return true;
    

}


}
let c = new CreateTopic();

// create topic
//c.createTopic();

//publish fake scores
// c.publishScore("bafybeiho3phkvdc7feshvoll3oyhg7spjx7hrg7mhxmpzl7enz6j6lf6ma", 5, "TEST_ACC");
// c.publishScore("bafybeiho3phkvdc7feshvoll3oyhg7spjx7hrg7mhxmpzl7enz6j6lf6ma", 7, "TEST_ACC");
// c.publishScore("bafybeiho3phkvdc7feshvoll3oyhg7spjx7hrg7mhxmpzl7enz6j6lf6ma", 10, "TEST_ACC");
// c.publishScore("bafybeiho3phkvdc7feshvoll3oyhg7spjx7hrg7mhxmpzl7enz6j6lf6ma", 25, "TEST_ACC");