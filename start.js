RedwoodHighFrequencyTrading.controller("HFTStartController", 
["$scope",
 "RedwoodSubject",
 "SVGGraphing",
 "ConfigManager",
 "SynchronizedStopWatch",
function ($scope, rs, graphing, configManager, stopWatch) {

    // module private variables
    var CLOCK_FREQUENCY = 50;

    function animateLimits () {
        /*var larger = $scope.intercepts.x > $scope.intercepts.y
            ? $scope.intercepts.x
            : $scope.intercepts.y;

        var lastLimits = rs.self.get("rp.last_limits");

        var baseLimits = {};
        baseLimits.x = $scope.currentRound > 1 ? lastLimits.x : $scope.limits.x;
        baseLimits.y = $scope.currentRound > 1 ? lastLimits.y : $scope.limits.y;

        $(baseLimits).animate({x: larger, y: larger}, {
            duration: $scope.config.limitAnimDuration,
            easing: "easeInOutCubic",
            step: function (now, fx) {
                if (!$scope.$$phase) {
                    $scope.$apply(function () {
                        $scope.limits[fx.prop] = now;
                    })
                } else {
                    $scope.limits[fx.prop] = now;
                }
            }
        });

        rs.set("rp.last_limits", {x: larger, y: larger});*/
    }

    var tick = function(tick){
        console.log("ran tick");
        $scope.tradingGraph.draw(Date.now());
    }

    rs.on_load(function () {
        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = configManager.loadPerSubject(rs, {
            testValue               : "Hello World Test"
        });

        console.log($scope.config.testValue);

        $scope.tradingGraph = graphing.makeTradingGraph("graph1");
        $scope.tradingGraph.init(Date.now());

        $scope.clock = stopWatch.instance()
            .frequency(CLOCK_FREQUENCY)
            .onTick(tick)
            .duration(500000);

        $scope.clock.start();

        /*
        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        }
        if ($scope.config.computeEndowment) {
            console.log(rs.self.user_id)
            $scope.endowment = ea.getAssignedEndowment(rs.self.user_id, {
                endowmentA: {x: 100, y: 0},
                endowmentB: {x: 0, y: 50},
                minimizeEquilibriumPrice: $scope.config.minimizeEquilibriumPrice
            });
        }

        if ($scope.config.showEndowment) {
            $scope.shownEndowment = $scope.endowment;
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        tatonnement = ta.TatonnementAlgorithm($scope.config);

        rs.trigger("rp.configuration", $scope.config);
        rs.trigger("rp.endowment", $scope.endowment);
        rs.trigger("rp.next_round");

        if ($scope.config.saveAllocation) {
            ea.save();
        }*/
    });



    rs.on("rp.next_round", function () {

        /*//Reset the text on the button to reflect that it is 'active'
        $scope.ButtonText = "Confirm";
        $scope.waiting = true;

        // Begin next round
        $scope.currentRound++;
        $scope.cursor = undefined;
        $scope.selection = null;
        if ($scope.config.useDefaultSelection) {
            $scope.selection = [$scope.endowment.x, $scope.endowment.y];
        }
        rs.trigger("rp.selection", $scope.selection)

        // set initial price
        var price = rs.self.get("rp.price");
        $scope.price = $scope.currentRound > 1 ? price : $scope.config.Price;
        console.log("price: " + $scope.price);

        // find x and y intercepts
        $scope.intercepts = {};
        $scope.intercepts.x = $scope.endowment.x + $scope.endowment.y / $scope.price;
        $scope.intercepts.y = $scope.endowment.y + $scope.price * $scope.endowment.x;

        // set plot limits
        $scope.limits = {}
        $scope.limits.x = $scope.config.XLimit ? $scope.config.XLimit : $scope.intercepts.x;
        $scope.limits.y = $scope.config.YLimit ? $scope.config.YLimit : $scope.intercepts.y;
        animateLimits();

        // set budget functions
        $scope.budgetFunction = function (x) {
            return $scope.endowment.y + $scope.price * ($scope.endowment.x - x);
        }
        $scope.inverseBudgetFunction = function (y) {
            return $scope.endowment.x + ($scope.endowment.y - y) / $scope.price;
        }

        rs.trigger("rp.round_started", {
            "round": $scope.currentRound,
            "endowment": $scope.endowment,
            "price": $scope.price
        });
        $scope.inputEnabled = true;

        // setup timer
        if ($scope.config.timeLimit > 0) {
            if (!$scope.stopWatch) {
                $scope.timeRemaining = 0;
                // The round which this timer was started
                $scope.timerRound = $scope.currentRound;
                $scope.stopWatch = stopWatch.instance()
                    .frequency(1)
                    .duration($scope.config.timeLimit)
                    .onTick(function (tick, t) {
                        $scope.timeRemaining = $scope.timeTotal - t;
                    })
                    .onComplete(function () {
                        $scope.confirm();
                        $scope.stopWatch = null;
                    }).start();
            } else {
                $scope.stopWatch.duration($scope.stopWatch.getDurationInTicks() + $scope.config.timeLimit - $scope.timeRemaining)
            }

            $scope.timeTotal = $scope.stopWatch.getDurationInTicks();
        }

        // flash the Confirm Selection button to alert the subject that a new round started
        // ooh the dirty dirty JQuery (.n.)
        var confirmButton = $("#confirmButton");
        confirmButton.effect("highlight", {color: "#c6feb6"}, 500, function() {
            confirmButton.effect("highlight", {color: "#c6feb6"}, 500);
        });*/
    });

    rs.on("rp.selection", function (selection) {
        //$scope.selection = selection;
    })

    rs.on("rp.confirm", function (position) {
        /*$scope.inputEnabled = false; // for recovery

        //Switch text on the button so that participant knows button has been pressed
        $scope.ButtonText = "Confirmed";
        $scope.waiting = false;


        rs.synchronizationBarrier('rp.round_' + $scope.currentRound).then(function () {
            // Calculate current price
            var currentPrice = $scope.price;

            // Compute tatonnement data for this round]
            var subjectData = ta.getSubjectData(rs.subjects);
            var roundContext = ta.RoundContext(currentPrice, subjectData);

            // check if demand is under threshold (epsilon)
            var roundsUnder = rs.self.get("rp.rounds_under_epsilon");
            if (Math.abs(roundContext.excessDemandPerCapita) < $scope.config.epsilon) {
                roundsUnder += 1;
            } else {
                roundsUnder = 0;
            }
            rs.set("rp.rounds_under_epsilon", roundsUnder);

            // If demand has been under threshold for @roundsUnderEpsilon rounds,
            // or if the maximum number of rounds have been played, 
            // or if the all of the weightvector weights have been used, stop tatonnement
            if (roundsUnder            >= $scope.config.roundsUnderEpsilon
                || $scope.currentRound >= $scope.config.rounds
                || tatonnement.weightVectorFinished()) {

                var actualAllocation = tatonnement.adjustedAllocation(
                    $scope.selection,
                    $scope.endowment,
                    roundContext,
                    $scope.config.marketMaker);

                $scope.selection = [actualAllocation.x, actualAllocation.y];

                // reset rounds under epsilon
                rs.set("rp.rounds_under_epsilon", 0);
                rs.trigger("rp.perform_allocation", actualAllocation);
                return;
            }

            // Get adjusted price
            var newPrice = tatonnement.adjustedPrice(roundContext);

            // Proceed to next round
            rs.set("rp.price", newPrice);
            rs.trigger("rp.next_round");
        });*/
    });

    // Recieve result (whether X or Y was chosen) from admin.
    // This result is really only used for practice rounds.
    rs.on("rp.result", function (result) {
        /*result.period = rs.period;
        rs.set("rp.results", result);

        if($scope.config.plotResult) {
            $scope.finalResult = result;
            rs.next_period($scope.config.delay);
        } else {
            rs.next_period();
        }*/
    });

    $scope.$on("rpPlot.click", function (event, selection) {
        //rs.trigger("rp.selection", selection);
    });

    $scope.confirm = function () {
        /*$scope.inputEnabled = false;
        rs.trigger("rp.confirm", {
            "round": $scope.currentRound,
            "x": $scope.selection[0],
            "y": $scope.selection[1]
        });*/
    };
}]);
