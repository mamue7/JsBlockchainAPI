/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelDBClass = require('./levelDB.js');
const db = new LevelDBClass.LevelDB();
const Block = require('./Block.js');

class Blockchain {

    constructor(){
      let self = this;
      // check if genesis block (index=0) exists
      self.getBlock(0).catch(function(err) {
          // create genesis block on init
          self.addGenesisBlock().then(function(value) { console.log(value);});
      });
    }
  
    // Add new block
    addNewBlock(newBlock){
      let self = this;
      return new Promise(function(resolve, reject) {      
        self.getBlockHeight()
          .then(function(value) {
            // set height of the block
            newBlock.height = value;
            // set previous block hash
            self.getBlock(newBlock.height-1).then(function(previousBlock) {
              // previous block hash
              newBlock.previousBlockHash = previousBlock.hash;
              // UTC timestamp
              newBlock.time = new Date().getTime().toString().slice(0,-3);
              // Block hash with SHA256 using newBlock and converting to a string
              newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
              // Adding block object to chain
              db.addLevelDBData(newBlock.height, JSON.stringify(newBlock).toString())
                .then(function(value) {
                  resolve('Block ' + newBlock.height + ' successfully added to chain!');
                }, function(err) {
                  reject('Error adding Block ' + newBlock.height + ' to chain! Error: ' + err);
                }
              );
            });
          },
          function(err) {
            // getBlockHeight rejects if genesis block doesn't exist
            self.addGenesisBlock()
              .then(function(value) {
                console.log(value);
                // continue to add new block after genesis block has been created
                self.addNewBlock(newBlock);
              },
              function(err) {
                console.log(err);
              }
            );
          }
        );
      });
    }
  
    // Add genesis block to chain
    addGenesisBlock() {
      return new Promise((resolve, reject) => {
        let genBlock = new Block.Block("First block in the chain - Genesis block");
        genBlock.time = new Date().getTime().toString().slice(0,-3);
        genBlock.hash = SHA256(JSON.stringify(genBlock)).toString();
        // Adding block object to chain
        db.addLevelDBData(genBlock.height, JSON.stringify(genBlock).toString())
          .then(function(value) {
            resolve('Genesis Block successfully added to chain!');
          }, function(err) {
            reject('Error adding Genesis Block to chain! Error: ' + err);
          }
        );
      });
    }
  
    // Get block height
    getBlockHeight() {
      return new Promise((resolve, reject) => {
        db.getBlocksCount().then(function(count) {
          if(count == 0) {
            reject();
          }
          else {
            resolve(count);
          }
        });
      });
    }
  
    // Get block by height
    getBlock(blockHeight){
      return new Promise((resolve, reject) => {
        db.getLevelDBData(blockHeight).then(function(value) {
          if(value)
              resolve(JSON.parse(value));
          else
            reject();
        },
        function(err) {
          reject(err);
        });
      })
    }
  
    // Validate block
    validateBlock(blockHeight){
      let self = this;
      return new Promise((resolve, reject) => {
        self.getBlock(blockHeight).then(function(block) {
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';
          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash === validBlockHash) {
            resolve("Block " + blockHeight + " is valid!");
          } 
          else {
            reject("Error! Block " + blockHeight + " is not valid!");
          }
        });
      });
    }
  
    // Validate blockchain
    validateChain(){
      let self = this;
      return new Promise((resolve, reject) => {
        let errorLog = [];
        self.getBlockHeight()
          .then(function(value) {
            for (var i = 0; i < value; i++) {
              // validate block
              if (!self.validateBlock(i))
                errorLog.push(i);
              // compare blocks hash link
              self.getBlock(i).then(function(block) { 
                self.getBlock(block.height+1).then(function(nextBlock) { 
                  if(block.hash !== nextBlock.previousBlockHash){
                    errorLog.push(i);
                  }
                },
                function(err){});
              });  
            }
          }
        );
        if (errorLog.length>0) {
          reject(errorLog);
        } else {
          resolve();
        }
      });
    }
}

  module.exports.Blockchain = Blockchain;
  