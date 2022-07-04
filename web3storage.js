/*
*
* this has functionality to connect, upload and retrieve models via web3.storage
* 
*/

// allow us to grab our .env variables
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, 'config.env') });

//import { Web3Storage, getFilesFromPath } from 'web3.storage'
const { Web3Storage, getFilesFromPath } = require("web3.storage");
//import { Web3Storage, getFilesFromPath } from 'web3.storage/dist/bundle.esm.min.js';
const fs = require('fs');
const  tf  = require("@tensorflow/tfjs");
const FileReader = require('filereader');
const { model } = require('@tensorflow/tfjs');


// Delete the model.
// await tf.io.removeModel('localstorage://demo/management/model1');


class Storage{


    constructor(){
        //this.api_token= process.env.WEB3_API_TOKEN;  
        this.api_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIwOTg3MEU2ZkY5M2Y1NkIzOThiMWQ2N0EwQzg2QzdhOUYyNERGODgiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NDgwNDA2NDIwMTMsIm5hbWUiOiJmZWQtcmwtZ3JhZGllbnRzIn0.ay2LbNKpxwIvgDSHdKocX5ju2bwv-KdfCfT5TZXST4U';     
        
        this.client = new Web3Storage({ token: this.api_token });
    }



    async storeFiles (files) {
        const cid = await this.client.put(files)
        console.log('stored files with cid:', cid)
        return cid
      }




    async getArtifacts()
    {
        // const request1 = window.indexedDB.open('tensorflowjs', 1);   
        // request1.onsuccess = e => {
        //     var db = e.target.result;          
        //     db.transaction("models_store").objectStore("models_store").get("models/local-model").onsuccess = event => {               
        //         const modelArtifacts = event.target.result.modelArtifacts;
        //         console.log(modelArtifacts);
        //         if (modelArtifacts)
        //         {   
        //             //success_callback(modelArtifacts);
        //             return modelArtifacts;
        //         }
        //       };
        // }  
        var db = await new Promise( resolve => {
            var request = window.indexedDB.open('tensorflowjs', 1);
            request.onsuccess = () => resolve(request.result);
        });
        var artifacts = await new Promise( resolve => {
            var tx = db.transaction("models_store");
            var request = tx.objectStore("models_store").get("models/local-model");
            request.onsuccess = () => resolve(request.result);


        });
        return artifacts.modelArtifacts;

    }

    async uploadLocalModel(modelArtifacts)
    {
        // get model.json in variable
        const weightsManifest = [{
            paths: ['weights.bin'],
            weights: modelArtifacts.weightSpecs
        }];
        const modelJSON = {
            modelTopology: modelArtifacts.modelTopology,
            weightsManifest,
            format: modelArtifacts.format,
            generatedBy: modelArtifacts.generatedBy,
            convertedBy: modelArtifacts.convertedBy
        };

        var model_json = JSON.stringify(modelJSON);
        // get weights.bin in variable

        // create File objects and post to web3storage
        var weights_file = new File([modelArtifacts.weightData], 'weights.bin' );
        var model_file = new File([model_json], "model.json", {type:'application/json'});
        var files = [model_file, weights_file];

        return await this.client.put(files);
            
    }    
       
    





    // use model path to upload example --> const MODEL_SAVE_PATH_ = 'indexeddb://cart-pole-v1';
    async uploadLocalModelOld()
    {
        //const modelPath = 'indexeddb://local-model-1';
        //const localWeightsPath = '/Users/david-webber/Downloads/2-tfjs-examples/cart-pole/models/local-model/weights.bin';
        //maybe change this to just local-model
        
        const request1 = window.indexedDB.open('tensorflowjs', 1);
        
        request1.onsuccess = e => {
            var db = e.target.result;
            
            // const onRootCidReady = cid => {
            //     return cid;
            //   }
            db.transaction("models_store").objectStore("models_store").get("models/local-model").onsuccess = event => {
                
                
                const modelArtifacts = event.target.result.modelArtifacts;
                console.log(modelArtifacts);
                // get model.json in variable
                const weightsManifest = [{
                    paths: ['weights.bin'],
                    weights: modelArtifacts.weightSpecs
                  }];
                const modelJSON = {
                    modelTopology: modelArtifacts.modelTopology,
                    weightsManifest,
                    format: modelArtifacts.format,
                    generatedBy: modelArtifacts.generatedBy,
                    convertedBy: modelArtifacts.convertedBy
                  };

                var model_json = JSON.stringify(modelJSON);
                // get weights.bin in variable

                // create File objects and post to web3storage
                var weights_file = new File([modelArtifacts.weightData], 'weights.bin' );
                var model_file = new File([model_json], "model.json", {type:'application/json'});
                var files = [model_file, weights_file];

                return this.client.put(files);
                // (async () =>  {
                //     console.log('Putting files now!');
                //     cid = await this.client.put(files); // Promise<CIDString>
                //     console.log('stored file with cid:', cid)
                //     return cid;
                // })();

              };
        }    
        // const LOCAL_MODEL_SAVE_PATH_ = "indexeddb://models/local-model";
        // console.log('getting files from path!');
        // const pathFile = await getFilesFromPath(LOCAL_MODEL_SAVE_PATH_);
        // console.log('Putting files now!');
        // const cid = await this.client.put(pathFile); // Promise<CIDString>
        // console.log('stored file with cid:', cid)
        // return cid;
    }

    async downloadGlobalModel(cid)
    {
        console.log('Downloading Global Model!');
        console.log('getting files..');


        //start test code
        //get files
        const res = await this.getFile(cid);
        const files = await res.files();
        var weights_file = null;
        var json_file = null;
        console.log(files.length);
        for(let i = 0; i < files.length; i++)
        {
            console.log(files[i].name);
            // replaced 'local-model/filename.filetype' with 'filename.filetype'
            if (files[i].name == 'weights.bin')
            {
                weights_file = files[i];
            }
            if (files[i].name == 'model.json')
            {
                json_file = files[i];
            }
        }
        // end test code


        // start og code
        // //get weights file from web3 storage
        // const res_weights = await this.getFile(weights_cid);
        // // unpack File objects from the response
        // const weights_files = await res_weights.files();
        // //get first file of array downloaded
        // const weights_file = weights_files[0];
        
        // //get json file from web3 storage
        // const res_json = await this.getFile(json_cid);
        // // unpack File objects from the response
        // const json_files = await res_json.files();
        // //get first file of array downloaded
        // const json_file = json_files[0];
        // end og code


        console.log('Loading layers...');
        console.log(`${json_file}`);
        console.log(`${weights_file}`);
        const model = await tf.loadLayersModel(tf.io.browserFiles([json_file, weights_file]));
        console.log('Loaded!')
        
        //console.log(model.getWeights()[0].dataSync());

        const GLOBAL_MODEL_SAVE_PATH_ = 'indexeddb://models/global-model';
        console.log('Saving global model..');
        const saved_results = await model.save(GLOBAL_MODEL_SAVE_PATH_);
        console.log('Saved!');

    }

    async putFile(fileInput)
    {
        // Pack files into a CAR and send to web3.storage

        // documentation code:
        // const cid = await client.put(files)
        // console.log('stored files with cid:', cid)
        // return cid
        const cid = await this.client.put(fileInput.files); // Promise<CIDString>
        console.log('stored files with cid:', cid)
        return cid;

    }


    async getFile(cid)
    {
        const res = await this.client.get(cid)
        console.log(`Got a response! [${res.status}] ${res.statusText}`)
        if (!res.ok) {
            throw new Error(`failed to get ${cid}`)
        }
        //save file downloaded to local file system
        

        return res;
    }




}
module.exports = { Storage }