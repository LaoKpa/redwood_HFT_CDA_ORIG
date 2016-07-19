// this module stores all game data for high frequency trading

Redwood.factory("DataStorage", function () {
   var api = {};

   api.createDataStorage = function (group, groupNum, speedCost, startingWealth) {
      var dataStorage = {};

      dataStorage.startTime = 0;          // experiment start time
      dataStorage.group = group;          // array containing uid of every player in this group
      dataStorage.groupNum = groupNum;    // identifier for this group
      dataStorage.curFundPrice = 0;       // current fundamental price. used for finding fp delta
      dataStorage.speedCost = speedCost;
      dataStorage.startingWealth = startingWealth;

      dataStorage.speedChanges = [];      // array of speed change events: [timestamp, speed, uid]
      dataStorage.stateChanges = [];      // array of state change events: [timestamp, state, uid]
      dataStorage.spreadChanges = [];     // array of spread change events: [timestamp, spread, uid]
      dataStorage.profitChanges = [];     // array of profit change events: [timestamp, deltaProfit, uid]
      dataStorage.investorArrivals = [];  // array of investor arrival events: [timestamp, buyOrSell]
      dataStorage.fundPriceChanges = [];  // array of fundamental price change events: [timestamp, deltaPrice, cumPrice]
      dataStorage.playerOrders = [];     // array of player order lists [timestamp, [player order]]
      dataStorage.buyOrderChanges = [];   // array of changes in the buy order book [timestamp, [buy order book after], [buy order book before]]
      dataStorage.sellOrderChanges = [];  // array of changes in the sell order book [timestamp, [sell order book], [buy order book before]]

      dataStorage.init = function (startFP, startTime) {
         this.startTime = startTime;
         this.curFundPrice = startFP;
         this.fundPriceChanges.push([0, startFP, startFP]);
         this.investorArrivals.push([0, "NA"]);
         this.buyOrderChanges.push([0, [], []]);
         this.sellOrderChanges.push([0, [], []]);

         for (let user of this.group) {
            this.speedChanges.push([0, "NO", user]);
            this.stateChanges.push([0, "OUT", user]);
            this.spreadChanges.push([0, 5, user]);
            this.profitChanges.push([0, 0, user]);
         }

         $("#ui").append("<button class='btn' id='export-btn-" + groupNum + "' type='button'>Export Group " + this.groupNum + " CSV</button>");
         $("#export-btn-" + groupNum)
            .button()
            .click(function () {
               dataStorage.exportDataCsv();
            });
      };

      dataStorage.storeMsg = function (message) {
         switch (message.msgType) {
            case "USPEED" :
               this.storeSpeedChange(message.msgData[2], message.msgData[1] ? "YES" : "NO", message.msgData[0]);
               break;
            case "UOUT" :
               this.storeStateChange(message.msgData[1], "OUT", message.msgData[0]);
               break;
            case "UMAKER" :
               this.storeStateChange(message.msgData[1], "MAKER", message.msgData[0]);
               break;
            case "USNIPE" :
               this.storeStateChange(message.msgData[1], "SNIPE", message.msgData[0]);
               break;
            case "UUSPR" :
               this.storeSpreadChange(message.msgData[2], message.msgData[1], message.msgData[0]);
               break;
            case "C_TRA" :
               this.storeTransaction(message.timeStamp, message.msgData[1], message.msgData[2], message.msgData[3], message.msgData[4]);
               break;
            case "FPC" :
               this.storeFPC(message.timeStamp, message.msgData[1])
         }
      };

      dataStorage.storePlayerOrder = function (timestamp, order) {
         this.playerOrders.push([timestamp - this.startTime, order]);
      };
      
      dataStorage.storeBuyOrderState = function (timestamp, buyOrders, buyOrdersBefore) {
         // use jquery extend to do a deep copy of market state
         this.buyOrderChanges.push([timestamp - this.startTime, $.extend(true, [], buyOrders), buyOrdersBefore]);
      };
      
      dataStorage.storeSellOrderState = function (timestamp, sellOrders, sellOrdersBefore) {
         this.sellOrderChanges.push([timestamp - this.startTime, $.extend(true, [], sellOrders), sellOrdersBefore]);
      };

      dataStorage.storeSpeedChange = function (timestamp, speed, uid) {
         this.speedChanges.push([timestamp - this.startTime, speed, uid]);
      };

      dataStorage.storeStateChange = function (timestamp, state, uid) {
         this.stateChanges.push([timestamp - this.startTime, state, uid]);
      };

      dataStorage.storeSpreadChange = function (timestamp, spread, uid) {
         this.spreadChanges.push([timestamp - this.startTime, spread, uid]);
      };

      dataStorage.storeTransaction = function (timestamp, price, fundPrice, buyer, seller) {
         if (buyer != 0) {
            this.profitChanges.push([timestamp - this.startTime, fundPrice - price, buyer]);
         }

         if (seller != 0) {
            this.profitChanges.push([timestamp - this.startTime, price - fundPrice, seller]);
         }
      };

      dataStorage.storeFPC = function (timestamp, price) {
         this.fundPriceChanges.push([timestamp - this.startTime, price - this.curFundPrice, price]);
         this.curFundPrice = price;
      };

      // function to combine all data into one big array and download it as a CSV
      dataStorage.exportDataCsv = function () {
         var data = [];

         // associative array to map each player to a unique index
         var playerToIndex = {};
         for (let index = 0; index < this.group.length; index++) {
            playerToIndex[this.group[index]] = index;
         }

         var numColumns = this.group.length * 5 + 9;

         // iterate through every entry in each storage array

         // add speed changes to data array
         for (let entry of this.speedChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 3] = entry[1];

            data.push(row);
         }

         // add state changes to data array
         for (let entry of this.stateChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 1] = entry[1];

            data.push(row);
         }

         // add spread changes to data array
         for (let entry of this.spreadChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 2] = entry[1];

            data.push(row);
         }

         // add profit changes to data array
         for (let entry of this.profitChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[playerToIndex[entry[2]] * 5 + 4] = entry[1];

            data.push(row);
         }

         // add investor changes to data array
         for (let entry of this.investorArrivals) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 1] = entry[1];

            data.push(row);
         }

         // add fundamental price changes to data array
         for (let entry of this.fundPriceChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 3] = entry[1];
            row[numColumns - 2] = entry[2];

            data.push(row);
         }

         // add player order lists to data array
         for (let entry of this.playerOrders) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];
            row[numColumns - 4] = entry[1].join(' ');

            data.push(row);
         }

         // add buy order changes to data array
         for (let entry of this.buyOrderChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];

            // add before market state to data
            if (entry[2].length === 0) row[numColumns - 8] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let origTimes = [];
               let prices = [];

               for (let marketCol of entry[2].reverse()) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - this.startTime);
                     prices.push(marketRow.price);
                     origTimes.push(marketRow.originTimestamp - this.startTime);

                  }
               }

               row[numColumns - 8] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + "), 'time_orig': (" + origTimes.join(', ') + ")}\"";
            }

            // add after market state to data
            if (entry[1].length === 0) row[numColumns - 7] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let origTimes = [];
               let prices = [];

               for (let marketCol of entry[1].reverse()) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - this.startTime);
                     prices.push(marketRow.price);
                     origTimes.push(marketRow.originTimestamp - this.startTime);

                  }
               }

               row[numColumns - 7] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + "), 'time_orig': (" + origTimes.join(', ') + ")}\"";
            }

            data.push(row);
         }

         // add sell order changes to data array
         for (let entry of this.sellOrderChanges) {
            let row = new Array(numColumns).fill(null);

            row[0] = entry[0];

            // add before market state to data
            if (entry[2].length === 0) row[numColumns - 6] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let origTimes = [];
               let prices = [];

               for (let marketCol of entry[2].reverse()) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - this.startTime);
                     prices.push(marketRow.price);
                     origTimes.push(marketRow.originTimestamp - this.startTime);
                  }
               }

               row[numColumns - 6] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + "), 'time_orig': (" + origTimes.join(', ') + ")}\"";
            }

            // add after market state to data
            if (entry[1].length === 0) row[numColumns - 5] = "EMPTY";
            else {
               let ids = [];
               let times = [];
               let origTimes = [];
               let prices = [];

               for (let marketCol of entry[1].reverse()) {
                  for (let marketRow of marketCol.reverse()) {
                     ids.push(marketRow.id);
                     times.push(marketRow.timestamp - this.startTime);
                     prices.push(marketRow.price);
                     origTimes.push(marketRow.originTimestamp - this.startTime);
                  }
               }

               row[numColumns - 5] = "\"{'id': (" + ids.join(', ') + "), 'time': (" + times.join(', ') + "), 'price': (" + prices.join(', ') + "), 'time_orig': (" + origTimes.join(', ') + ")}\"";
            }

            data.push(row);
         }

         // sort data by timestamp
         data.sort(function (a, b) {
            return a[0] - b[0];
         });

         // combine rows with same timestamp
         var loopAgain = true;
         while (loopAgain) {
            loopAgain = false;
            for (let row = 1; row < data.length; row++) {
               if (data[row][0] === data[row - 1][0]) {
                  loopAgain = true;
                  for (let col = 0; col < data[row].length; col++) {
                     if (data[row][col] !== null) {
                        data[row - 1][col] = data[row][col];
                     }
                  }
                  data.splice(row, 1);
               }
            }
         }

         // fill empty market state rows appropriately
         for (let row = 1; row < data.length; row++) {
            // if buy before column is empty, assume all buy state columns are empty
            // probably not the best way to do this
            if (data[row][numColumns - 8] === null) {
               // copy after state from previous row into both columns for this row
               data[row][numColumns - 8] = data[row - 1][numColumns - 7];
               data[row][numColumns - 7] = data[row - 1][numColumns - 7];
            }

            // do the same for sell orders
            if (data[row][numColumns - 6] === null) {
               data[row][numColumns - 6] = data[row - 1][numColumns - 5];
               data[row][numColumns - 5] = data[row - 1][numColumns - 5];
            }
         }

         // set empty delta and investor columns to 0 and NA respectively
         for (let row of data) {
            for (let index = 0; index < this.group.length; index++) {
               if (row[index * 5 + 4] === null) row[index * 5 + 4] = 0;
            }
            if (row[numColumns - 3] === null) row[numColumns - 3] = 0;
            if (row[numColumns - 1] === null) row[numColumns - 1] = "NA";
            if (row[numColumns - 4] === null) row[numColumns - 4] = "NA";
         }

         // fill empty cells with the value above them
         for (let row = 1; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
               if (data[row][col] === null) data[row][col] = data[row - 1][col];
            }
         }

         // calculate cumulative profits for each player
         // set initial cumulative profits
         for (let index = 0; index < this.group.length; index++) {
            data[0][index * 5 + 5] = this.startingWealth;
         }
         // calculate for all other rows
         for (let row = 0; row < data.length - 1; row++) {
            for (let index = 0; index < this.group.length; index++) {
               // each row's cumulative profit is the previous row's profit plus dprofit, minus speed cost if applicable
               data[row + 1][index * 5 + 5] = data[row][index * 5 + 5] + data[row + 1][index * 5 + 4];
               if (data[row][index * 5 + 3] == "YES") {
                  data[row + 1][index * 5 + 5] -= (data[row + 1][0] - data[row][0]) * this.speedCost / 1000;
               }
            }
         }

         // set up headings for each column
         data.unshift(["timestamp"]);
         for (let index = 0; index < this.group.length; index++) {
            data[0].push("status_p" + this.group[index], "spread_p" + this.group[index], "speed_p" + this.group[index], "dprofit_p" + this.group[index], "cumprofit_p" + this.group[index]);
         }
         data[0].push("buy_orders_before", "buy_orders_after", "sell_orders_before", "sell_orders_after", "porder", "dvalue", "cumvalue", "investor_buy_sell");

         // download data 2d array as csv
         // stolen from stackoverflow
         var csvRows = [];
         for (let index = 0; index < data.length; index++) {
            csvRows.push(data[index].join(','));
         }
         var csvString = csvRows.join("\n");
         var a = document.createElement('a');
         a.href = 'data:attachment/csv,' + encodeURIComponent(csvString);
         a.target = '_blank';
         a.download = 'group_' + this.groupNum + '.csv';

         document.body.appendChild(a);
         a.click();
         a.remove();
      };

      return dataStorage;
   };

   return api;
});