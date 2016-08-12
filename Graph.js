/* Angular service used for creating svg elements that graphically represent a market
 *  Created by Zachary Petersen - zacharypetersen1@gmail.com
 *  And Morgan! - gramorgan@gmail.com
 *
 *  To use this service, inject it and call makeTradingGraph(svgElementID)
 *     This will return a new graph object. Call graph.init(timeStamp) to
 *     initialize the graph, call graph.draw(timeStamp) to update the graph.
 */

RedwoodHighFrequencyTrading.factory("Graphing", function () {
   var api = {};

   // Returns new grpah object - pass in id of svg element on which graph will be drawn
   api.makeTradingGraph = function (marketSVGElementID, profitSVGElementID, adminStartTime, playerTimeOffset) {
      var graph = {};

      graph.marketElementId = marketSVGElementID;  //id of the market graph svg element
      graph.profitElementId = profitSVGElementID;  //id of the profit graph svg element
      graph.elementWidth = 0;          //Width and Height of both svg elements
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.graphPaddingRight = 20;    // how far from the x axis label that the line stops moving
      graph.marketSVG = d3.select('#' + graph.marketElementId); //market svg element
      graph.profitSVG = d3.select('#' + graph.profitElementId); //profit svg element
      graph.minPriceMarket = 0;             //min price on price axis for market graph
      graph.maxPriceMarket = 0;             //max price on price axis for market graph
      graph.centerPriceMarket = 0;          //desired price for center of graph
      graph.minPriceProfit = 0;             //min price on price axis for profit graph
      graph.maxPriceProfit = 0;             //max price on price axis for profit graph
      graph.centerPriceProfit = 0;
      graph.graphAdjustSpeedMarket = .1;      //speed that market price axis adjusts in pixels per frame
      graph.graphAdjustSpeedProfit = .1;      //speed that profit price axis adjusts in pixels per frame
      graph.marketPriceGridIncrement = 1;     //amount between each line on market price axis
      graph.profitPriceGridIncrement = 1;     //amount between each line on profit price axis
      graph.contractedTimeInterval = 30;      //amount of time displayed on time axis when graph is contracted
      graph.timeInterval = graph.contractedTimeInterval; //current amount in seconds displayed at once on full time axis
      graph.timeIncrement = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.marketPriceLines = [];           //
      graph.timeLines = [];
      graph.pricesArray = [];
      graph.adminStartTime = adminStartTime;
      graph.timeOffset = playerTimeOffset;            //offset to adjust for clock difference between lab computers
      graph.expandedGraph = false;
      graph.timeSinceStart = 0;        //the amount of time since the start of the experiment in seconds
      graph.timePerPixel = 0;          // number of ms represented by one pixel
      graph.advanceTimeShown = 0;      // the amount of time shown to the right of the current time on the graph

      graph.marketZoomLevel = 4;       // current zoom level for each graph
      graph.profitZoomLevel = 4;
      graph.maxZoomLevel = 4;          // maximum allowed zoom level
      graph.zoomAmount = 0;            // amount zoomed per click

         graph.getCurOffsetTime = function () {
         return Date.now() - this.timeOffset;
      };

      graph.setExpandedGraph = function () {
         this.expandedGraph = true;
      };

      graph.setContractedGraph = function () {
         this.expandedGraph = false;
         this.timeInterval = this.contractedTimeInterval;
         this.timePerPixel = graph.timeInterval * 1000 / (graph.elementWidth - graph.axisLabelWidth - graph.graphPaddingRight);
         this.advanceTimeShown = graph.timePerPixel * (graph.axisLabelWidth + graph.graphPaddingRight);
      };

      graph.zoomMarket = function (zoomIn) {
         if (zoomIn && this.marketZoomLevel < this.maxZoomLevel) {
            this.maxPriceMarket -= this.zoomAmount;
            this.minPriceMarket += this.zoomAmount;
            this.marketZoomLevel++;
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         }
         else if (!zoomIn && this.marketZoomLevel > 0) {
            this.maxPriceMarket += this.zoomAmount;
            this.minPriceMarket -= this.zoomAmount;
            this.marketZoomLevel--;
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         }
      };

      graph.zoomProfit = function (zoomIn) {
         if (zoomIn && this.profitZoomLevel < this.maxZoomLevel) {
            this.maxPriceProfit -= this.zoomAmount;
            this.minPriceProfit += this.zoomAmount;
            this.profitZoomLevel++;
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         }
         else if (!zoomIn && this.profitZoomLevel > 0) {
            this.maxPriceProfit += this.zoomAmount;
            this.minPriceProfit -= this.zoomAmount;
            this.profitZoomLevel--;
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         }
      };

      graph.calculateSize = function () {
         this.elementWidth = $('#' + this.marketElementId).width();
         this.elementHeight = $('#' + this.marketElementId).height();
      };

      graph.mapProfitPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceProfit - price) / (this.maxPriceProfit - this.minPriceProfit);
         return this.elementHeight * percentOffset;
      };

      graph.mapMarketPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceMarket - price) / (this.maxPriceMarket - this.minPriceMarket);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function (timeStamp) {
         var percentOffset;
         if (this.timeSinceStart >= this.timeInterval) {
            percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         }
         else {
            percentOffset = (timeStamp - this.adminStartTime) / (this.timeInterval * 1000);
         }
         return (this.elementWidth - this.axisLabelWidth - this.graphPaddingRight) * percentOffset;
      };

      graph.millisToTime = function (timeStamp) {
         var secs = (timeStamp - this.adminStartTime) / 1000;
         var mins = Math.trunc(secs / 60);
         secs %= 60;
         return mins + ":" + ("00" + secs).substr(-2, 2);
      };

      graph.calcPriceGridLines = function (maxPrice, minPrice, increment) {
         var gridLineVal = minPrice + increment - (minPrice % increment);
         // adjust for mod of negative numbers not being negative
         if(minPrice < 0) gridLineVal -= increment;
         var lines = [];
         while (gridLineVal < maxPrice) {
            lines.push(gridLineVal);
            gridLineVal += increment;
         }
         return lines;
      };

      graph.calcTimeGridLines = function (startTime, endTime, increment) {
         var timeLineVal = startTime - ((startTime - this.adminStartTime) % increment);
         var lines = [];
         while (timeLineVal < endTime) {
            lines.push(timeLineVal);
            timeLineVal += increment;
         }
         return lines;
      };

      graph.getTimeGridClass = function (timeStamp) {
         if (timeStamp % (this.timeIncrement * 2000) == 0)
            return "time-grid-box-light";
         else return "time-grid-box-dark";
      };

      graph.drawTimeGridLines = function (graphRefr, svgToUpdate) {
         //Draw rectangles for time grid lines
         svgToUpdate.selectAll("rect.time-grid-box-dark")
            .data(this.timeLines)
            .enter()
            .append("rect")
            .filter(function (d) {
               // only draw elements that are an even number of increments from the start
               return ((d - graphRefr.adminStartTime) / (graphRefr.timeIncrement * 1000)) % 2 == 0;
            })
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d);
            })
            .attr("y", 0)
            .attr("width", this.timeIncrement / this.timeInterval * (this.elementWidth - this.axisLabelWidth - this.graphPaddingRight))
            .attr("height", this.elementHeight)
            .attr("class", "time-grid-box-dark");

         //Draw labels for time grid lines
         svgToUpdate.selectAll("text.time-grid-line-text")
            .data(this.timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d) + 5;
            })
            .attr("y", this.elementHeight - 5)
            .text(function (d) {
               return graphRefr.millisToTime(d)
            })
            .attr("class", "time-grid-line-text");
      };

      graph.drawPriceGridLines = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the lines for the price grid lines
         svgToUpdate.selectAll("line.price-grid-line")
            .data(priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function (d) {
               return priceMapFunction(d);
            })
            .attr("y2", function (d) {
               return priceMapFunction(d);
            })
            .attr("class", function (d) {
               return d != 0 ? "price-grid-line" : "price-grid-line-zero";
            });
      };

      //draws FP and offers
      graph.drawMarket = function (graphRefr, historyDataSet, currentData, styleClassName) {
         this.marketSVG.selectAll("line." + styleClassName)
            .data(historyDataSet, function (d) {
               return d;
            })
            .enter()
            .append("line")
            .filter(function (d) {
               return d[1] >= (graphRefr.currentTime - graphRefr.timeInterval * 1000);
            })
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[1]);
            })
            .attr("y1", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[2]);
            })
            .attr("y2", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[2]);
            })
            .attr("class", styleClassName);

         if (currentData != null) {
            this.marketSVG.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]))
               .attr("x2", this.curTimeX)
               .attr("y1", this.mapMarketPriceToYAxis(currentData[1]))
               .attr("y2", this.mapMarketPriceToYAxis(currentData[1]))
               .attr("class", styleClassName);
         }
      };

      //draws profit line
      graph.drawProfit = function (graphRefr, historyDataSet, currentData, outStyleClass, makerStyleClass, snipeStyleClass) {
         this.profitSVG.selectAll("line." + outStyleClass + " line." + makerStyleClass + " line." + snipeStyleClass)
            .data(historyDataSet, function (d) {
               return d;
            })
            .enter()
            .append("line")
            .filter(function (d) {
               return d[1] >= (graphRefr.currentTime - graphRefr.timeInterval * 1000);
            })
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[1]);
            })
            .attr("y1", function (d) {
               return graphRefr.mapProfitPriceToYAxis(d[2]);
            })
            .attr("y2", function (d) {
               return graphRefr.mapProfitPriceToYAxis(d[3]);
            })
            .attr("class", function (d) {
               // a masterpiece
               return d[4] == "Out" ? outStyleClass : (d[4] == "Maker" ? makerStyleClass : snipeStyleClass);
            });

         if (currentData != null) {
            var pricefinal = currentData[1] - ((graphRefr.currentTime - currentData[0]) * currentData[2] / 1000); //determines how far down the line has moved
            this.profitSVG.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]))
               .attr("x2", this.curTimeX)
               .attr("y1", this.mapProfitPriceToYAxis(currentData[1]))
               .attr("y2", this.mapProfitPriceToYAxis(pricefinal))
               .attr("class", currentData[3] == "Out" ? outStyleClass : (currentData[3] == "Maker" ? makerStyleClass : snipeStyleClass));
         }
      };

      graph.drawOffers = function (graphRefr, dataHistory) {
         for (var user of dataHistory.group) {
            if (user !== dataHistory.myId) {
               this.drawMarket(graphRefr, dataHistory.playerData[user].pastBuyOffers, dataHistory.playerData[user].curBuyOffer, "others-buy-offer");
               this.drawMarket(graphRefr, dataHistory.playerData[user].pastSellOffers, dataHistory.playerData[user].curSellOffer, "others-sell-offer");
            }
         }
         this.drawMarket(graphRefr, dataHistory.playerData[dataHistory.myId].pastBuyOffers, dataHistory.playerData[dataHistory.myId].curBuyOffer, "my-buy-offer");
         this.drawMarket(graphRefr, dataHistory.playerData[dataHistory.myId].pastSellOffers, dataHistory.playerData[dataHistory.myId].curSellOffer, "my-sell-offer");
      };

      graph.drawAllProfit = function (graphRefr, dataHistory) {
         for (var user of dataHistory.group) {
            if (user !== dataHistory.myId) {
               this.drawProfit(graphRefr, dataHistory.playerData[user].pastProfitSegments, dataHistory.playerData[user].curProfitSegment, "others-profit-out", "others-profit-maker", "others-profit-snipe");
            }
         }
         this.drawProfit(graphRefr, dataHistory.playerData[dataHistory.myId].pastProfitSegments, dataHistory.playerData[dataHistory.myId].curProfitSegment, "my-profit-out", "my-profit-maker", "my-profit-snipe");
      };

      graph.drawPriceAxis = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the text that goes along with the price gridlines and axis
         svgToUpdate.selectAll("text.price-grid-line-text")
            .data(priceLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.elementWidth - this.axisLabelWidth + 12)
            .attr("y", function (d) {
               return priceMapFunction(d) + 3;
            })
            .attr("class", "price-grid-line-text")
            .text(function (d) {
               return d;
            });
      };

      graph.drawTransactions = function (graphRefr, historyDataSet, myId) {
         graphRefr.marketSVG.selectAll("line.my-positive-transactions line.my-negative-transactions line.other-transactions")
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("y1", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[1]);
            })
            .attr("y2", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[2]);
            })
            .attr("class", function (d) {
               if (d[3] == myId) {
                  return d[2] - d[1] > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else if (d[4] == myId) {
                  return d[1] - d[2] > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else return "other-transactions";
            });
      };

      graph.calcPriceBounds = function (dHistory) {
         // calc bounds for market graph
         // check to see if current FP is outside of middle 80% of screen
         if (dHistory.curFundPrice[1] > (.2 * this.minPriceMarket) + (.8 * this.maxPriceMarket) ||
             dHistory.curFundPrice[1] < (.8 * this.minPriceMarket) + (.2 * this.maxPriceMarket)) {
            this.centerPriceMarket = dHistory.curFundPrice[1];
         }

         var curCenterMarket = (this.maxPriceMarket + this.minPriceMarket) / 2;

         if (Math.abs(this.centerPriceMarket - curCenterMarket) > 1) {
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
            if (this.centerPriceMarket > curCenterMarket) {
               this.maxPriceMarket += this.graphAdjustSpeedMarket;
               this.minPriceMarket += this.graphAdjustSpeedMarket;
            }
            else {
               this.maxPriceMarket -= this.graphAdjustSpeedMarket;
               this.minPriceMarket -= this.graphAdjustSpeedMarket;
            }
         }

         //calc bounds for profit graph

         if (dHistory.profit > (.2 * this.minPriceProfit) + (.8 * this.maxPriceProfit) ||
             dHistory.profit < (.8 * this.minPriceProfit) + (.2 * this.maxPriceProfit)) {
            this.centerPriceProfit = dHistory.profit;
         }

         var curCenterProfit = (this.maxPriceProfit + this.minPriceProfit) / 2;

         if (Math.abs(this.centerPriceProfit - curCenterProfit) > 1) {
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
            if (this.centerPriceProfit > curCenterProfit) {
               this.maxPriceProfit += this.graphAdjustSpeedProfit;
               this.minPriceProfit += this.graphAdjustSpeedProfit;
            }
            else {
               this.maxPriceProfit -= this.graphAdjustSpeedProfit;
               this.minPriceProfit -= this.graphAdjustSpeedProfit;
            }
         }
      };

      graph.draw = function (dataHistory) {
         //Clear the svg elements
         this.marketSVG.selectAll("*").remove();
         this.profitSVG.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = this.getCurOffsetTime();
         this.timeSinceStart = (this.currentTime - dataHistory.startTime) / 1000;
         if (this.expandedGraph) {
            this.timeInterval = this.timeSinceStart;
            this.timePerPixel = this.timeInterval * 1000 / (this.elementWidth - this.axisLabelWidth - this.graphPaddingRight);
            this.advanceTimeShown = this.timePerPixel * (this.axisLabelWidth + this.graphPaddingRight);
         }

         this.curTimeX = this.mapTimeToXAxis(this.currentTime);

         // recalculate market price bounds
         this.calcPriceBounds(dataHistory);

         //Check if it is necessary to recalculate timeLines
         // recalculate if right edge of graph is more than a batch length past last batch line
         // or if left edge is more than a batch length past first batch line
         // Math.max expression finds time at left edge of screen
         if (this.currentTime + this.advanceTimeShown > this.timeLines[this.timeLines.length - 1] + this.timeIncrement ||
             Math.max(this.adminStartTime, this.currentTime - this.timeInterval * 1000) < this.timeLines[0] - this.timeIncrement) {
            this.timeLines = this.calcTimeGridLines(this.currentTime - this.timeInterval * 1000, this.currentTime + this.advanceTimeShown, this.timeIncrement * 1000);
         }

         //Invoke all of the draw functions
         this.drawTimeGridLines(graphRefr, this.marketSVG);
         this.drawTimeGridLines(graphRefr, this.profitSVG);

         this.drawPriceGridLines(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceGridLines(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawMarket(graphRefr, dataHistory.pastFundPrices, dataHistory.curFundPrice, "price-line");
         this.drawOffers(graphRefr, dataHistory);
         this.drawTransactions(graphRefr, dataHistory.transactions, dataHistory.myId);

         this.drawPriceAxis(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceAxis(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawAllProfit(graphRefr, dataHistory);
      };

      graph.init = function (startFP, maxSpread, startingWealth) {
         // set price bounds for both graphs
         this.maxPriceMarket = startFP + maxSpread;
         this.minPriceMarket = startFP - maxSpread;
         this.centerPriceMarket = (this.maxPriceMarket + this.minPriceMarket) / 2;
         this.maxPriceProfit = startingWealth + maxSpread;
         this.minPriceProfit = startingWealth - maxSpread;
         this.centerPriceProfit = (graph.maxPriceProfit + graph.minPriceProfit) / 2;

         this.calculateSize();
         this.timePerPixel = graph.timeInterval * 1000 / (graph.elementWidth - graph.axisLabelWidth - graph.graphPaddingRight);
         this.advanceTimeShown = graph.timePerPixel * (graph.axisLabelWidth + graph.graphPaddingRight);

         this.zoomAmount = maxSpread / 2;

         this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         this.timeLines = this.calcTimeGridLines(this.adminStartTime, this.adminStartTime + this.timeInterval * 1000 + this.advanceTimeShown, this.timeIncrement * 1000);
      };

      return graph;
   };


   return api;

});
