// try with tfjs node?
const  tf  = require("@tensorflow/tfjs");
const fs = require('fs');



class Aggregation {


constructor(){
    
    //try this? needs to make sure a model file exists
    //this.local_model = await tf.loadLayersModel('file://models/local-model/model.json');
    //used for calculating running average, to keep track of number of times aggregated
    this.num_of_aggregated_tensors = 1;
    //will hold sum of all tensors aggregated
    //this.currentAggregatedTensor = this.local_model.getWeights();
    this.currentAggregatedTensor = null;
    this.currentLocalTensor = null;


}



// NOTE: local file system tests, needs to be loading/ saving models from/to browser indexedDB storage instead
//only should be caled if a local model and global model file is created
async federateModels() {
    
    // local model path indexxed db
    const LOCAL_MODEL_SAVE_PATH_ = 'indexeddb://models/local-model';
    // global model path indexxed db
    const GLOBAL_MODEL_SAVE_PATH_ = 'indexeddb://models/global-model';
    const local_model = await tf.loadLayersModel(LOCAL_MODEL_SAVE_PATH_); 
    //try this? make sure there is a global models file
    const global_model = await tf.loadLayersModel(GLOBAL_MODEL_SAVE_PATH_);
    
    // const local_model = await tf.loadLayersModel('file://models/local-model/model.json'); 
    // //try this? make sure there is a global models file
    // const global_model = await tf.loadLayersModel('file://models/global-model/model.json');

    //const local_weights = local_model.getWeights();
    //maybe call this something different? revise!

    // if its first run, then currentAggregated tensor will just be local model
    this.currentLocalTensor = local_model.getWeights();
    var currentGlobalTensor = global_model.getWeights();
    //console.log(currentGlobalTensor[0].dataSync());

    if (this.currentAggregatedTensor == null)
        {
            this.currentAggregatedTensor = local_model.getWeights();
            
            this.currentAggregatedTensor[0] = tf.add(this.currentAggregatedTensor[0], currentGlobalTensor[0]);
            this.currentAggregatedTensor[1] = tf.add(this.currentAggregatedTensor[1], currentGlobalTensor[1]);
            this.currentAggregatedTensor[2] = tf.add(this.currentAggregatedTensor[2], currentGlobalTensor[2]);
            this.currentAggregatedTensor[3] = tf.add(this.currentAggregatedTensor[3], currentGlobalTensor[3]);
                  
            
            
        }
    else
    //otherwise, current aggregated tensor will be whatever currentAggreted tensor was + new local model weights
    {
       
        //this should constantly keep tensor of total values used for running average, however will require more memory the more aggregations that take place
        //could research a more efficient solution to this
        this.currentAggregatedTensor[0] = tf.add(this.currentAggregatedTensor[0], currentGlobalTensor[0]);
        this.currentAggregatedTensor[1] = tf.add(this.currentAggregatedTensor[1], currentGlobalTensor[1]);
        this.currentAggregatedTensor[2] = tf.add(this.currentAggregatedTensor[2], currentGlobalTensor[2]);
        this.currentAggregatedTensor[3] = tf.add(this.currentAggregatedTensor[3], currentGlobalTensor[3]);

    }
    
    this.num_of_aggregated_tensors = this.num_of_aggregated_tensors + 1;
    const b = tf.scalar(this.num_of_aggregated_tensors);

  
    //perform running average
    this.currentLocalTensor[0] = tf.div(this.currentAggregatedTensor[0], b);
    this.currentLocalTensor[1] = tf.div(this.currentAggregatedTensor[1], b);
    this.currentLocalTensor[2] = tf.div(this.currentAggregatedTensor[2], b);
    this.currentLocalTensor[3] = tf.div(this.currentAggregatedTensor[3], b);
    
    console.log('aggregated tensor == sum of all tensors:');
    console.log(this.currentAggregatedTensor[0].dataSync());
    console.log('current Tensor == averaged tensor:');
    console.log(this.currentLocalTensor[0].dataSync())
    console.log('local weights tensor == current local values:');
    console.log(local_model.getWeights()[0].dataSync());
    console.log('global weights tensor == current downloaded values:');
    console.log(currentGlobalTensor[0].dataSync());

    //set weights to local model
    local_model.setWeights(this.currentLocalTensor);
    //jest error on save :Unsupported TypedArray subtype: Float32Array
    //save results to local file system
    console.log('Saving results..');

    //delete files before saving new model
    // fs.unlink('./models/local-model/model.json', function (err) {
    //     if (err) throw err;
    //     // if no error, file has been deleted successfully
    //     console.log('-- local-model/model.json File deleted!');
    // });
    // fs.unlink('./models/local-model/weights.bin', function (err) {
    //     if (err) throw err;
    //     // if no error, file has been deleted successfully
    //     console.log('-- local-model/weights.bin File deleted!');
    // });
    
    //const saved_results = await local_model.save('file://models/local-model/');
    const saved_results = await local_model.save(LOCAL_MODEL_SAVE_PATH_);

    console.log('--new local model saved!');
    console.log(saved_results);

    return true;
}

}

module.exports = { Aggregation }

