Redwood.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function (groupArgs, sendFunction) {
      var groupManager = {};

      groupManager.marketAlgorithms = {};   // reference to all market algorithms in this group, mapped by subject id ---> marketAlgorithms[subjectID]
      groupManager.market = {};             // reference to the market object for this group
      groupManager.dataStore = {};

      groupManager.priceChanges = groupArgs.priceChanges;         // array of all price changes that will occur
      groupManager.investorArrivals = groupArgs.investorArrivals; // array of all investor arrivals that will occur
      groupManager.priceIndex = 1;                                // index of last price index to occur. start at 1 because start FP is handled differently
      groupManager.investorIndex = 0;                             // index of last investor arrival to occur
      groupManager.intervalPromise = null;                        // promise for canceling interval when experiment ends

      groupManager.groupNumber = groupArgs.groupNumber;
      groupManager.memberIDs = groupArgs.memberIDs; // array that contains id number for each subject in this group
      groupManager.syncFpArray = [];                // buffer that holds onto messages until received msg from all subjects
      groupManager.delay = 500;                     // # of milliseconds that will be delayed by latency simulation

      groupManager.syncFPArray = new SynchronizeArray(groupManager.memberIDs);
      groupManager.FPMsgList = [];

      groupManager.isDebug = groupArgs.isDebug;     //indicates if message logger should be used

      if (groupManager.isDebug) {
         // add the logging terminal to the ui section of the html
         $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group ' + groupManager.groupNumber +
            ' Message Log</div><div id="group-' + groupManager.groupNumber + '-log" class="terminal"></div></div>');
         groupManager.logger = new MessageLogger("Group Manager " + String(groupManager.groupNumber), "#5555FF", "group-" + groupManager.groupNumber + "-log");
      }

      // wrapper for the redwood send function
      groupManager.rssend = function (key, value) {
         sendFunction(key, value, "admin", 1, this.groupNumber);
      };

      groupManager.sendToDataHistory = function (msg, uid) {
         this.rssend("To_Data_History_" + uid, msg);
      };

      groupManager.sendToAllDataHistories = function (msg) {
         this.dataStore.storeMsg(msg);
         this.rssend("To_All_Data_Histories", msg);
      };

      // sends a message to all of the market algorithms in this group
      groupManager.sendToMarketAlgorithms = function (msg) {
         for (var memberID of this.memberIDs) {
            this.marketAlgorithms[memberID].recvFromGroupManager(msg);
         }
      };

      // receive a message from a single market algorithm in this group
      groupManager.recvFromMarketAlgorithm = function (msg) {

         if (this.isDebug) {
            this.logger.logRecv(msg, "Market Algorithm");
         }

         // synchronized message in response to fundamental price change
         if (msg.protocol === "SYNC_FP") {
            //mark that this user sent msg
            this.syncFPArray.markReady(msg.msgData[0]);
            this.FPMsgList.push(msg);


            // check if every user has sent a response
            if (this.syncFPArray.allReady()) {
               // shuffle the order of messages sitting in the arrays
               var indexOrder = this.getRandomMsgOrder(this.FPMsgList.length);

               // store player order for debugging purposes
               var playerOrder = [];

               // send msgs in new shuffled order
               for (var index of indexOrder) {
                  playerOrder.push(this.FPMsgList[index].msgData[0]);
                  for (var rmsg of this.FPMsgList[index].msgData[2]) {
                     this.sendToMarket(rmsg);
                  }
               }
               
               this.dataStore.storePlayerOrder(msg.timeStamp, playerOrder);

               // reset arrays for the next fundamental price change
               this.FPMsgList = [];
               this.syncFPArray = new SynchronizeArray(this.memberIDs);
            }
         }

         // general message that needs to be passed on to marketManager
         if (msg.protocol === "OUCH") {
            groupManager.sendToMarket(msg);
         }
      };

      // this sends message to market with specified amount of delay
      groupManager.sendToMarket = function (msg) {
         //If no delay send msg now, otherwise send after delay
         if (msg.delay) {
            window.setTimeout(this.market.recvMessage.bind(this.market), this.delay, msg);
         }
         else {
            this.market.recvMessage(msg);
         }
      };

      // handles a message from the market
      groupManager.recvFromMarket = function (msg) {

         if (this.isDebug) {
            this.logger.logRecv(msg, "Market");
         }

         switch (msg.msgType) {
            case "C_EBUY"  :
            case "C_ESELL" :
            case "C_RBUY"  :
            case "C_RSELL" :
            case "C_UBUY"  :
            case "C_USELL" :
               this.marketAlgorithms[msg.msgData[0]].recvFromGroupManager(msg);
               break;
            case "C_TRA"   :
               this.sendToMarketAlgorithms(msg);
         }
         
         this.dataStore.storeMarketState(msg.timeStamp, this.market.CDABook, msg.buyOrdersBeforeState, msg.sellOrdersBeforeState);
      };

      // handles message from subject and passes it on to market algorithm
      groupManager.recvFromSubject = function (msg) {

         if (this.isDebug) {
            this.logger.logRecv(msg, "Subjects");
         }

         // if this is a user message, handle it and don't send it to market
         if (msg.protocol === "USER") {
            var subjectID = msg.msgData[0];
            this.marketAlgorithms[subjectID].recvFromGroupManager(msg);

            this.dataStore.storeMsg(msg);
            if (msg.msgType == "UMAKER") this.dataStore.storeSpreadChange(msg.msgData[1], this.marketAlgorithms[subjectID].spread, msg.msgData[0]);
         }
      };

      // creates an array from 0 to size-1 that are shuffled in random order
      groupManager.getRandomMsgOrder = function (size) {

         // init indices from 0 to size-1
         var indices = [];
         var rand;
         var temp;
         for (var i = 0; i < size; i++) {
            indices.push(i);
         }

         // shuffle
         for (i = size - 1; i > 0; i--) {
            rand = Math.floor(Math.random() * size);
            temp = indices[i];
            indices[i] = indices[rand];
            indices[rand] = temp;
         }
         return indices;
      };

      groupManager.sendNextPriceChange = function () {
         // if current price is -1, end the game
         if (this.priceChanges[this.priceIndex][1] == -1) {
            this.dataStore.exportDataCsv();
            this.rssend("end_game", this.groupNumber);
            return;
         }

         var msg = new Message("ITCH", "FPC", [Date.now(), this.priceChanges[this.priceIndex][1], this.priceIndex]);
         msg.delay = false;
         this.dataStore.storeMsg(msg);
         this.sendToMarketAlgorithms(msg);

         this.priceIndex++;

         window.setTimeout(this.sendNextPriceChange, this.startTime + this.priceChanges[this.priceIndex][0] - Date.now());
      }.bind(groupManager);

      groupManager.sendNextInvestorArrival = function () {
         var msg2 = new Message("OUCH", this.investorArrivals[this.investorIndex][1] == 1 ? "EBUY" : "ESELL", [0, 214748.3647, true]);
         msg2.delay = false;
         this.sendToMarket(msg2);

         this.investorIndex++;

         window.setTimeout(this.sendNextInvestorArrival, this.startTime + this.investorArrivals[this.investorIndex][0] - Date.now());
      }.bind(groupManager);

      groupManager.update = function () {
         //Looks for change in fundamental price and sends message if change is found
         if (this.priceIndex < this.priceChanges.length
            && Date.now() > this.priceChanges[this.priceIndex][0] + this.startTime) {
            if (this.priceChanges[this.priceIndex][1] == -1) {
               this.dataStore.exportDataCsv();
               this.rssend("end_game", this.groupNumber);
            }
            else {
               var msg = new Message("ITCH", "FPC", [Date.now(), this.priceChanges[this.priceIndex][1], this.priceIndex]);
               msg.delay = false;
               this.dataStore.storeMsg(msg);
               this.sendToMarketAlgorithms(msg);
               this.priceIndex++;
            }
         }

         //looks for investor arrivals and sends message if one has occurred
         if (this.investorIndex < this.investorArrivals.length
            && Date.now() > this.investorArrivals[this.investorIndex][0] + this.startTime) {
            var msg2 = new Message("OUCH", this.investorArrivals[this.investorIndex][1] == 1 ? "EBUY" : "ESELL", [0, 214748.3647, true]);
            msg2.delay = false;
            this.sendToMarket(msg2);
            this.investorIndex++;
         }
      };

      return groupManager;
   };

   return api;
});
