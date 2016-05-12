Redwood.factory("MarketAlgorithm", function () {
   var api = {};

   api.createMarketAlgorithm = function(myId, groupId, groupManager, redwoodSend){
      var marketAlgorithm = {};

      marketAlgorithm.spread = 5;
      marketAlgorithm.using_speed = false;
      marketAlgorithm.state = "state_out";
      marketAlgorithm.buyEntered = false;
      marketAlgorithm.sellEntered = false;

      //Create the logger for this start.js page
      marketAlgorithm.logger = new MessageLogger("Market Algorithm " + String(myId), "#FF5555", "group-" + groupId + "-log");
      marketAlgorithm.myId = myId;
      marketAlgorithm.groupId = groupId;
      marketAlgorithm.groupManager = groupManager;   //Sends message to group manager, function obtained as parameter
      marketAlgorithm.fundementalPrice = 15;

      // sends a message to the group manager via direct reference
      marketAlgorithm.sendToGroupManager = function(msg){
         this.groupManager.recvFromMarketAlgorithm(msg);
      };

      // sends a message to the dataHistory object for this subject via rs.send
      marketAlgorithm.sendToDataHistory = function(msg){
         redwoodSend("To_Data_History_" + String(this.myId), msg, "admin", 1, this.groupId);
      };

      // sends out buy and sell offer for entering market
      marketAlgorithm.enterMarket = function(){
         var nMsg = new Message("OUTCH", "EBUY", [this.myId, this.fundementalPrice - this.spread/2] );
         nMsg.delay = !this.using_speed;
         var nMsg2 = new Message("OUTCH", "ESELL", [this.myId, this.fundementalPrice + this.spread/2] );
         nMsg2.delay = !this.using_speed;
         this.sendToGroupManager(nMsg);
         this.sendToGroupManager(nMsg2);
         this.buyEntered = true;
         this.sellEntered = true;
      };

      // sends out remove buy and sell messages for exiting market
      marketAlgorithm.exitMarket = function(){
         var nMsg = new Message("OUTCH", "RBUY", [this.myId] );
         nMsg.delay = !this.using_speed;
         var nMsg2 = new Message("OUTCH", "RSELL", [this.myId] );
         nMsg2.delay = !this.using_speed;
         this.sendToGroupManager(nMsg);
         this.sendToGroupManager(nMsg2);
         this.buyEntered = false;
         this.sellEntered = false;
      };

      // Handle message sent to the market algorithm
      marketAlgorithm.recvFromGroupManager = function(msg){

         this.logger.logRecv(msg, "Group Manager");
         

         // Fundemental Price Change
         if(msg.msgType === "FPC"){

            // update fundemental price variable
            this.fundementalPrice = msg.msgData[1];

            // send message to data history recording price change
            var nmsg = new Message("DATA", "FPC", msg.msgData);
            this.sendToDataHistory(nmsg);
/*
            //send player state to group manager
            var nMsg3;
            if (this.state == "state_out") {
               nMsg3 = new Message ("SYNC_FP", "NONE", [this.myId, this.using_speed, msg.msgData[2]]);
            }
            else if (this.state == "state_maker") {
               nMsg3 = new Message ("SYNC_FP", "UOFFERS", [this.myId, this.using_speed, msg.msgData[2], this.spread]);
            }
            else if (this.state == "state_snipe") {
               nMsg3 = new Message ("SYNC_FP", "SNIPE", [this.myId, this.using_speed, msg.msgData[2]]);
            }
            else {
               console.error("invalid state");
               return;
            }
            this.sendToGroupManager (nMsg3);*/
         }

         // user sent signal to change state to market maker. Need to enter market.
         if(msg.msgType === "UMAKER"){
            this.enterMarket();                 // enter market
            this.state = "state_maker";         // set state           
         }

         // user sent signal to change state to sniper
         if(msg.msgType === "USNIPE"){            
            if(this.state === "state_maker"){   // if switching from being a maker, exit the market
               this.exitMarket();
            }
            this.state = "state_snipe";         // update state
         }

         // user sent signal to change state to "out of market"
         if(msg.msgType === "UOUT"){
            if(this.state === "state_maker"){   // if switching from being a maker, exit the market
               this.exitMarket();
            }
            this.state = "state_out";           // update state
         }

         if(msg.msgType === "USPEED"){
            this.using_speed = msg.msgData[0];
         }

         //User updated their spread
         if(msg.msgType === "UUSPR"){
            this.spread = msg.msgData[0];

            //See if there are existing orders that need to be updated
            if(this.buyEntered){
               var nMsg = new Message("OUTCH", "UBUY", [this.myId, this.fundementalPrice - this.spread/2] );
               nMsg.delay = !this.using_speed;
               this.sendToGroupManager(nMsg);
            }
            if(this.sellEntered){
               var nMsg2 = new Message("OUTCH", "USELL", [this.myId, this.fundementalPrice + this.spread/2] );
               nMsg2.delay = !this.using_speed;
               this.sendToGroupManager(nMsg2);
            }
         }

         // Confirmation that a buy offer has been placed in market
         if(msg.msgType == "C_EBUY"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My buy offer confirmed at time: " + millisToTime(msg.msgData[2]) );
               var nMsg = new Message("DATA", "C_EBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_ESELL"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My sell offer confirmed at time: " + millisToTime(msg.msgData[2]) );
               var nMsg = new Message("DATA", "C_ESELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a buy offer has been removed from market
         if(msg.msgType == "C_RBUY"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My buy offer removed at time: " + millisToTime(msg.msgData[1]) );
               var nMsg = new Message("DATA", "C_RBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been placed in market
         if(msg.msgType == "C_RSELL"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My sell offer removed at time: " + millisToTime(msg.msgData[1]) );
               var nMsg = new Message("DATA", "C_RSELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a buy offer has been updated
         if(msg.msgType == "C_UBUY"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My buy offer updated at time: " + millisToTime(msg.msgData[2]) );
               var nMsg = new Message("DATA", "C_UBUY", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }

         // Confirmation that a sell offer has been updated
         if(msg.msgType == "C_USELL"){
            if(msg.msgData[0] == this.myId){
               this.logger.logString("My sell offer updated at time: " + millisToTime(msg.msgData[2]) );
               var nMsg = new Message("DATA", "C_USELL", msg.msgData);
               this.sendToDataHistory(nMsg);
            }
         }


      };

      return marketAlgorithm;
   };

   return api;
});
