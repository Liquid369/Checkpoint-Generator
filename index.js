//Initialize Libraries needed
const request = require('request');
//Put Explorer api link here,Iquidus is preffered atm and supported
var explorerAPILink = "https://blockbook.dogec.io/api/";
var explorerType = "blockbook"//Supported explorers are Iquidus,Blockbook and Bulwark atm
var blockspacing = 10000;
//get this number from last block on explorer
var currentblock = 487000;
//Set true or false depending on your requirement
var fBreadwallet = false;
var findBadTimes = true; //Check for blocks that have a time that is out of block order
var fisPIVXFork = true;
var fisEnergiFork = false;
var totaltx = 1027987;//get this from the tx=... number in the SetBestChain debug.log lines
var i = 0;
var b = 1;

var blocks = [];
//Blockbook only requirements,genesis block is not recorded in blockbook.
var genesishash = "0000093cfce0a5a3cecea522e2c13bdf055d65c559fd2222730ba6f0d18dd2cd";
var genesisbits = "0x1e0ffff0"
var genesistime = 1558130910;
function generateCheckpoints(blockdelay, blockcountcurr) {
    if (i +1<= blockcountcurr) {
        if (i + blockdelay > blockcountcurr || i > blockcountcurr)
            i = blockcountcurr;
        else if (i == 1)
            i = blockdelay;
        else if (i == 0) {
            outputdatax = "";
        } else
            i += blockdelay - 1;
        if(explorerType != "bulwark" || explorerType != "blockbook"){
        //Get block hash
        request(explorerAPILink + 'getblockhash?index=' + i, {
            json: false
        }, (err, res, body) => {
            currblockhash = body;
            //now that we got blockhash,get block data and parse it to needed info
            if(findBadTimes){
              if(i != 0){
                ConvertBlockData(body,i-1);
                ConvertBlockData(body,i);
                ConvertBlockData(body,i+1);
                i++;
              }else{
                ConvertBlockData(body,i);
                i++;
              }
            }else{
              ConvertBlockData(body,i);
            }
            //Call the func in of itself,emulating a for loop type situation.
            generateCheckpoints(blockspacing, currentblock);
        });
        }
        else if(explorerType == "blockbook"){
            ConvertBlockData(null,i);
            //Call the func in of itself,emulating a for loop type situation.
            generateCheckpoints(blockspacing, currentblock);
        }
    }else if(findBadTimes){
      blocks.sort(function(a,b) {
            return a.block - b.block;
        });
      for(x = 0; x < blocks.length; x++){
        if(x != 0 && x != blocks.length-1){
          if(blocks[x-1].time > blocks[x].time){
            console.log("BadTime " + blocks[x-1].block + ":" +blocks[x-1].time + " & " + blocks[x].block + ":" +blocks[x].time)
          }
        }
      }
    }
}
function ConvertBlockData(currblockhash,blockheight) {
    //TODO tidy up this code and move the checkpointing only here,and the blockheight and other needed info to another function
    var outputdata = ""
    if(explorerType == "iquidus"){
    request(explorerAPILink + 'getblock?hash=' + currblockhash, {json: true}, (err, res, body) => {
        var blockheightx =  body.height;
        var blocktime = body.time;
        var blockbits  = body.bits;
        if (fBreadwallet) {
            var hashinquotes = '"' + body.hash + '"';
            if (blockheightx == 0 || blockheightx < currentblock) { //genesis block or after gn
                outputdata = "{" + blockheightx + ",uint256(" + hashinquotes + "), " + blocktime + ",0x" + blockbits + "},";
            } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
              if(findBadTimes){
                blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                b++;
              }else{
                outputdata = "{" + blockheightx + ",uint256(" + hashinquotes + "), " + blocktime + ",0x" + blockbits + "}";
              }
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        } else if (fisPIVXFork) {
            var hashinquotes = '"0x' + body.hash + '"';
            if (blockheightx == 0) { //genesis block
                outputdata = "static Checkpoints::MapCheckpoints mapCheckpoints = \n";
                outputdata += "boost::assign::map_list_of\n";
                outputdata += "(" + blockheightx + ",uint256(" + hashinquotes + "))";
            } else if (blockheightx < currentblock && blockheightx > 0) {
              if(findBadTimes){
                blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                b++;
              }else{
                outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "))";
              }
            } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
                outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "));\n";
                outputdata += "static const Checkpoints::CCheckpointData data = {"
                         +"\n&mapCheckpoints,\n"
                         +blocktime + ",// * UNIX timestamp of last checkpoint block\n"
                         +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                         "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                         2000 + "       // * estimated number of transactions per day after checkpoint\n};";
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        }
        else if (fisEnergiFork) {
            var hashinquotes = '"0x' + body.hash + '"';
            if (blockheightx == 0) { //genesis block
                outputdata = "        checkpointData = {" +
                "\n{\n{"+blockheightx+",uint256S("+hashinquotes+")},\n";
            } else if (blockheightx < currentblock && blockheightx > 0) {
              if(findBadTimes){
                blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                b++;
              }else{
                outputdata = "{"+blockheightx+",uint256S("+hashinquotes+")},\n";
              }
            } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
               outputdata = "{"+blockheightx+",uint256S("+hashinquotes+")}\n}\n};\n";
               outputdata += "\nchainTxData = ChainTxData{\n"
               +blocktime + ",// * UNIX timestamp of last checkpoint block\n"
                         +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                         "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                         2000 + "       // * estimated number of transactions per day after checkpoint\n};";
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        }
    });
}
    else if(explorerType == "bulwark"){
       request(explorerAPILink + '/block/' + blockheight, {json: true}, (err, res, body) => {

        var hashinquotes = '"' + body.hash + '"';
        var blockheightx =  body.height;
        var blocktime = new Date(body.createdAt).getTime() / 1000;//get epoch from createdAt
        var blockbits  = body.bits;
        if (fBreadwallet) {
            if (body.height == 0 || body.height < currentblock) { //genesis block or after gn
                outputdata = "{" + body.height + ",uint256(" + hashinquotes + "), " + timeEpoch + ",0x" + blockbits + "},";
            } else if (body.height == currentblock) { //last block in checkpoints,so dont add , at end of output data
              if(findBadTimes){
                blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                b++;
              }else{
                outputdata = "{" + blockheightx + ",uint256(" + hashinquotes + "), " + blocktime + ",0x" + blockbits + "}";
              }
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        } else if (fisPIVXFork) {
            if (blockheightx == 0) { //genesis block
                outputdata = "static Checkpoints::MapCheckpoints mapCheckpoints = \n";
                outputdata += "boost::assign::map_list_of\n";
                outputdata += "(" + blockheightx + ",uint256(" + hashinquotes + "))";
            } else if (blockheightx < currentblock && blockheightx > 0) {
                if(findBadTimes){
                  blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                  b++;
                }else{
                  outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "))";
                }
            } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
                outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "));\n";
                outputdata += "static const Checkpoints::CCheckpointData data = {"
                         +"\n&mapCheckpoints,\n"
                         +blocktime + ",// * UNIX timestamp of last checkpoint block\n"
                         +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                         "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                         2000 + "       // * estimated number of transactions per day after checkpoint\n};";
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        }
        else if (fisEnergiFork) {
             hashinquotes = '"0x' + body.hash + '"';
            if (blockheightx == 0) { //genesis block
                outputdata = "        checkpointData = {" +
                "\n{\n{"+blockheightx+",uint256S("+hashinquotes+")},\n";
            } else if (blockheightx < currentblock && blockheightx > 0) {
              if(findBadTimes){
                blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
                b++;
              }else{
                outputdata = "{"+blockheightx+",uint256S("+hashinquotes+")},\n";
              }
            } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
               outputdata = "{"+blockheightx+",uint256S("+hashinquotes+")}\n}\n};\n";
               outputdata += "\nchainTxData = ChainTxData{\n"
               +timeEpoch + ",// * UNIX timestamp of last checkpoint block\n"
                         +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                         "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                         2000 + "       // * estimated number of transactions per day after checkpoint\n};";
            }
            if(!findBadTimes){
              console.log(outputdata)
            }
        }
    });
  }

  else if(explorerType == "blockbook"){
     request(explorerAPILink + 'block/' + blockheight, {json: true}, (err, res, body) => {
     var hashinquotes = '"' + body.hash + '"';
     var blockheightx =  body.height;
     var blocktime = body.time;
     var blockbits  = body.bits;
     if(i ==0 || blockheight == 0){
    //fill block data manually for genesis,since blockbook doesnt add data of genesis block for some reason
     hashinquotes = '"' + genesishash + '"';
     blockheightx = 0;
     blocktime = genesistime;
     blockbits = genesisbits
    }
     if (fBreadwallet) {
        if (blockheightx == 0 || blockheightx < currentblock) { //genesis block or after gn
            outputdata = "{" + blockheightx + ",uint256(" + hashinquotes + "), " + blocktime + ",0x" + blockbits + "},";
        } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
          if(findBadTimes){
            blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
            b++;
          }else{
            outputdata = "{" + blockheightx + ",uint256(" + hashinquotes + "), " + blocktime + ",0x" + blockbits + "}";
          }
        }
        if(!findBadTimes){
          console.log(outputdata)
        }
    } else if (fisPIVXFork) {
        if (blockheightx == 0) { //genesis block
            outputdata = "static Checkpoints::MapCheckpoints mapCheckpoints = \n";
            outputdata += "boost::assign::map_list_of\n";
            outputdata += "(" + blockheightx + ",uint256(" + hashinquotes + "))";
        } else if (blockheightx < currentblock && blockheightx > 0) {
            if(findBadTimes){
              blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
              b++;
            }else{
              outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "))";
            }
        } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
            outputdata = "(" + blockheightx + ",uint256(" + hashinquotes + "));\n";
            outputdata += "static const Checkpoints::CCheckpointData data = {"
                     +"\n&mapCheckpoints,\n"
                     +blocktime + ",// * UNIX timestamp of last checkpoint block\n"
                     +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                     "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                     2000 + "       // * estimated number of transactions per day after checkpoint\n};";
        }
        if(!findBadTimes){
          console.log(outputdata)
        }
    }
    else if (fisEnergiFork) {
        var hashinquotes = '"0x' + body.hash + '"';
        if (blockheightx == 0 || i ==0) { //genesis block
            hashinquotes = '"0x' + genesishash + '"';
            outputdata = "        checkpointData = {\n" +
            "          {\n           {"+blockheightx+",uint256S("+hashinquotes+")},";
        } else if (blockheightx < currentblock && blockheightx > 0) {
          if(findBadTimes){
            blocks[b] = {block:blockheightx, time:blocktime, Hash:hashinquotes};
            b++;
          }else{
            outputdata = "           {"+blockheightx+",uint256S("+hashinquotes+")},";
          }
        } else if (blockheightx == currentblock) { //last block in checkpoints,so dont add , at end of output data
           outputdata = "           {"+blockheightx+",uint256S("+hashinquotes+")}\n          }\n};\n";
           outputdata += "\nchainTxData = ChainTxData{\n"
                     +blocktime + ",// * UNIX timestamp of last checkpoint block\n"
                     +totaltx+",    // * total number of transactions between genesis and last checkpoint\n" +
                     "              //   (the tx=... number in the SetBestChain debug.log lines)\n" +
                     2000 + "       // * estimated number of transactions per day after checkpoint\n};";
        }
        if(!findBadTimes){
          console.log(outputdata)
        }
    }
   });
 }
if(!findBadTimes){
  ++i;
}
}
generateCheckpoints(blockspacing, currentblock);
