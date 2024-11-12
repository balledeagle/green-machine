// ==UserScript==
// @name          Green Machine UI
// @version       1.0.0
// @include       *://*.koalabeast.com*
// @author        Balled Eagle
// @require       http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

// This script is built using RonSpawnson's MLTP Live script as a template. Thanks!

function waitForInitialized(fn) {
    if (!tagpro) {
        setTimeout(function() {
            waitForInitialized(fn);
        }, 10);
    } else {
        fn();
    }
}

waitForInitialized(function() {
    tagpro.ready(function() {
        hideElements();

        //
        // OPTIONS ARE SET HERE
        // Use true or false unless otherwise specified
        //

        var gameLength = 6; //////// Set the length of the game. For pubs, this is 6. Adjusts the timer bar in the scoreboard
        var showTeamNames = false; // Whether or not team names are shown by default
        var redTeamName = "RED" //// Default team name for red team. !! Must be in quotes !!
        var blueTeamName = "BLUE" // Default team name for blue team. !! Must be in quotes !!
        var animateCaps = true; //// Whether or not the scoreboard moves and flashes for caps

        //
        // CAUTION
        // Don't touch the code below this point unless you know what you're doing
        //

        // Map and Performance Info

        var server, mapName, mapAuthor = "";

        function getServerName() {
            if (tagproConfig.gameSocket != undefined) {
                server = tagproConfig.gameSocket;
                server = server.slice(7);
                server = server.substring(0,(server.length-20));
                if (server == "sanfrancisco") { server = "San Francisco"; }
                if (server == "newyork") { server = "New York"; }
                if (server.charAt(0) == "c" && server.length == 8) { server = "Chicago " + server.charAt(7); }
                server = server.charAt(0).toUpperCase() + server.slice(1);
            } else {
                setTimeout(getServerName, 200);
            }
        }

        function getMapName() {
            if (tagpro.map != undefined) {
                mapName = tagpro.map.name;
                mapAuthor = tagpro.map.author;
                $("#mapNameName").html(mapName);
                $("#author").html(mapAuthor);
            } else {
                setTimeout(getMapName, 200);
            }
        }
        getServerName();


        // Canvas

        var canvasWidth, canvasHeight, canvasLeft, canvasTop;
        function getCanvasDimensions() {
            canvasWidth = $("#viewport").width();
            canvasHeight = $("#viewport").height();
            canvasLeft = ($(window).width() - canvasWidth)/2
            canvasTop = ($(window).height() - canvasHeight)/2;
        }

        getCanvasDimensions();

        // Scoreboard

        var scoreboardWidth = canvasWidth * 0.6;
        var scoreboardHeight = canvasHeight * 0.1;
        var triangleWidth = scoreboardHeight/2;
        var scoreboardBotPos = 20;
        var scoreboardLineHeight = scoreboardHeight * (2/3);
        var mapTriangleWidth = scoreboardLineHeight/3;
        var mapTriangleBorder = mapTriangleWidth*2.33607;
        var indicatorHeight = (scoreboardHeight/3) - 9;
        var indicatorFullWidth = indicatorHeight * 6;

        var scoreboardTop = canvasHeight * 0.9;
        var scoreboardLeft = canvasWidth * 0.3;
        var clockWidth = scoreboardHeight;
        var clockLeft = (scoreboardWidth - scoreboardHeight)/2;
        var timerFontSize = scoreboardHeight * 0.25;
        var scoreFontSize = timerFontSize * 3;
        var teamFontSize = scoreFontSize / 2;

        // Scores
        var scoreWidth = scoreboardHeight;
        var scoreTopPos = 0;
        var redScoreLeftPos = clockLeft - scoreWidth - 10;
        var blueScoreLeftPos = clockLeft + scoreWidth + 10;
        var capWidth = scoreboardWidth / 4;
        /*
        var scoreTop = scoreboardTop + scoreTopPos;
        var redScoreLeft = scoreboardLeft + redScoreLeftPos;
        var blueScoreLeft = scoreboardLeft + blueScoreLeftPos;
        */
        // Teams

        var teamWidth = scoreboardHeight * 3;
        var teamTop = teamFontSize-5;
        var redTeamLeftPos = redScoreLeftPos-teamWidth-5;
        var blueTeamLeftPos = blueScoreLeftPos + scoreboardHeight + 5

        // Timer

        var timerWidth = 96;
        var timerTopPos = 18;
        var timerLeftPos = 402;
        var clockBarWidth = scoreboardHeight*0.6;
        var clockBarIncrement = clockBarWidth / (gameLength * 60000);

        var timerTop = scoreboardTop + timerTopPos;
        var timerLeft = scoreboardLeft + timerLeftPos;

        // Flags and other important variables
        var isCTF = true;
        var redHasFlag, blueHasFlag, hasOvertimeStarted = false;
        var redFC, blueFC, redLastFC, blueLastFC = "";
        var redHoldTime, blueHoldTime, redGrabTime, blueGrabTime, redScore, blueScore = 0;
        var returns = [];
        var redPlayers = [];
        var bluePlayers = [];
        var players = [];
        var lastRedReturn, lastBlueReturn, lastRedReturnTime, lastBlueReturnTime;


        var selectedHalf = "";
        var domain = ".koalabeast.com";


        var element = document.getElementById("loadingMessage");
        var newElement = '<div style="position:absolute; top:' + canvasTop + 'px; left:' + canvasLeft + 'px; width: ' + (canvasWidth/2) + 'px; height: ' + (scoreboardLineHeight*(2/3)) + 'px;"> \
                              <div id="serverName" style="float:left; padding-left: 5px; padding-right: 5px; padding-top:2px; height: ' + (scoreboardLineHeight*(2/3)) + 'px; line-height: ' + (teamFontSize*0.4) + 'px; text-align:left; background-color: #00000099; color:white; font-family: \'IBM Plex Sans\'; font-size:' + (teamFontSize/2) + 'px; border-bottom: 3px solid #41f977;"><i>' + server + '</i><br/><i style="font-size:' + (teamFontSize/4) + 'px;"><span id="fps">---</span> FPS | <span id="ping">---</span> ms <span id="loss">| --% loss</span></i></div> \
                              <div id="mapTriangle" style="float:left; height: ' + (scoreboardLineHeight*(2/3)) + 'px; width: ' + (scoreboardLineHeight/3) + 'px; clip-path: polygon(0 0, 0% 100%, 100% 0); border-bottom: 3px solid #41f977; background-color: #00000099;"></div> \
                          </div> \
                          <div style="position:absolute; top:' + canvasTop + 'px; left:' + (canvasLeft + (canvasWidth/2)) + 'px; width: ' + (canvasWidth/2) + 'px; height: ' + (scoreboardLineHeight*(2/3)) + 'px;"> \
                              <div id="mapName" style="float:right; padding-left: 5px; padding-right: 5px; padding-top:2px; height: ' + (scoreboardLineHeight*(2/3)) + 'px; line-height: ' + (teamFontSize*0.4) + 'px; text-align:right; background-color: #00000099; color:white; font-family: \'IBM Plex Sans\'; font-size:' + (teamFontSize/2) + 'px; border-bottom: 3px solid #41f977;"><i><span id="mapNameName">' + mapName + '</span><br/><span id="author" style="font-size:' + (teamFontSize/4) + 'px;">' + mapAuthor + '</span></i></div> \
                              <div id="mapTriangle" style="float:right; height: ' + (scoreboardLineHeight*(2/3)) + 'px; width: ' + (scoreboardLineHeight/3) + 'px; clip-path: polygon(0 0, 100% 100%, 100% 0); border-bottom: 3px solid #41f977; background-color: #00000099;"></div> \
                          </div> \
                          <div id="scoreboard" style="position:relative; top:' + (scoreboardTop+canvasTop) + 'px; margin:0 auto; width: ' + scoreboardWidth + 'px; height: ' + scoreboardHeight + 'px;"> \
                              <div id="redTriangle" class="redBG" style="position:absolute; top:0px; left:0px; width: ' + triangleWidth + 'px; height: ' + scoreboardHeight + 'px; clip-path: polygon(0 0, 100% 100%, 100% 0); background-image: linear-gradient(to bottom, rgba(100,100,100,0), rgba(10,10,10,0.75));"></div> \
                              <div id="redBoard" class="redBG" style="position:absolute; top:0px; left:' + triangleWidth + 'px; width: ' + ((scoreboardWidth/2)-triangleWidth) + 'px; height: ' + scoreboardHeight + 'px; background-image: linear-gradient(to bottom, rgba(100,100,100,0), rgba(10,10,10,0.75));"> \
                                  <div id="redWhiteBar" style="position:absolute; z-index:3; top:' + (scoreboardLineHeight+2) + 'px; left:' + (((scoreboardWidth/2)-triangleWidth)/5) + 'px; width:80%; height:1px; background-image:linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0)); opacity:0.6;"></div> \
                              </div> \
                              <div id="redGrabbed" class="redBG" style="position:absolute; display:none; top:0px; z-index:2; left:' + triangleWidth + 'px; width: ' + ((scoreboardWidth/2)-triangleWidth) + 'px; height: ' + scoreboardHeight + 'px; background-image: linear-gradient(to bottom, rgba(246,39,87,0), rgba(246,39,87,0.75));"></div> \
                              <div id="redTriangleGrabbed" class="redBG" style="position:absolute; display:none; top:0px; left:0px; width: ' + triangleWidth + 'px; height: ' + scoreboardHeight + 'px; clip-path: polygon(0 0, 100% 100%, 100% 0); background-image: linear-gradient(to bottom, rgba(246,39,87,0), rgba(246,39,87,0.75));"></div> \
                              <div id="blueBoard" class="blueBG" style="position:absolute; top:0px; left: ' + (scoreboardWidth/2) + 'px; width: ' + ((scoreboardWidth/2)-triangleWidth) + 'px; height: ' + scoreboardHeight + 'px; background-image: linear-gradient(to bottom, rgba(100,100,100,0), rgba(10,10,10,0.75));"> \
                                  <div id="blueWhiteBar" style="position:absolute; z-index:3; top:' + (scoreboardLineHeight+2) + 'px; width:80%; height:1px; background-image:linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0)); opacity:0.6;"></div> \
                              </div> \
                              <div id="blueGrabbed" class="blueBG" style="position:absolute; display:none; top:0px; left: ' + (scoreboardWidth/2) + 'px; width: ' + ((scoreboardWidth/2)-triangleWidth) + 'px; height: ' + scoreboardHeight + 'px; background-image: linear-gradient(to bottom, rgba(49,207,218,0), rgba(49,207,218,0.75));"></div> \
                              <div id="blueTriangle" class="blueBG" style="position:absolute; top:0px; left: ' + (scoreboardWidth-triangleWidth) + 'px; width: ' + triangleWidth + 'px; height: ' + scoreboardHeight + 'px; clip-path: polygon(0 0, 0 100%, 100% 0); background-image: linear-gradient(to bottom, rgba(100,100,100,0), rgba(10,10,10,0.75));"></div> \
                              <div id="blueTriangleGrabbed" class="blueBG" style="position:absolute; display:none; top:0px; left: ' + (scoreboardWidth-triangleWidth) + 'px; width: ' + triangleWidth + 'px; height: ' + scoreboardHeight + 'px; clip-path: polygon(0 0, 0 100%, 100% 0); background-image: linear-gradient(to bottom, rgba(49,207,218,0), rgba(49,207,218,0.75));"></div> \
                              <div id="clockBorder" class="clockGroup" style="position:absolute; top:0px; z-index: 4; left: ' + clockLeft + 'px; width:' + clockWidth + 'px; height:' + clockWidth + 'px; border-radius:50%; background-image:linear-gradient(to bottom, #cccccc, #41f977);"></div> \
                              <div id="clockBorderRed" class="clockGroup" style="position:absolute; display:none; top:0px; z-index: 5; left: ' + clockLeft + 'px; width:' + clockWidth + 'px; height:' + clockWidth + 'px; border-radius:50%; background-image:linear-gradient(to bottom, #ffffff, #f62757);"></div> \
                              <div id="clockBorderBlue" class="clockGroup" style="position:absolute; display:none; top:0px; z-index: 5; left: ' + clockLeft + 'px; width:' + clockWidth + 'px; height:' + clockWidth + 'px; border-radius:50%; background-image:linear-gradient(to bottom, #ffffff, #31cfda);"></div> \
                              <div id="clockBase" class="clockGroup" style="position:absolute; top:2px; z-index: 6; left: ' + (clockLeft+2) + 'px; padding-top:' + (timerFontSize*0.8) + 'px; width:' + (clockWidth-4) + 'px; height:' + (clockWidth-4) + 'px; border-radius:50%; background: radial-gradient(#333333, #000000);"></div> \
                              <div id="clockRedColor" class="clockGroup" style="position:absolute; display:none; top:2px; z-index: 7; left: ' + (clockLeft+2) + 'px; padding-top:' + (timerFontSize*0.8) + 'px; width:' + (clockWidth-4) + 'px; height:' + (clockWidth-4) + 'px; border-radius:50%; color:white; text-align:center; background: radial-gradient(#f62757, #a0214a);"></div> \
                              <div id="clockBlueColor" class="clockGroup" style="position:absolute; display:none; top:2px; z-index: 7; left: ' + (clockLeft+2) + 'px; padding-top:' + (timerFontSize*0.8) + 'px; width:' + (clockWidth-4) + 'px; height:' + (clockWidth-4) + 'px; border-radius:50%; color:white; text-align:center; background: radial-gradient(#31cfda, #119fac);"></div> \
                              <div id="clockGoldColor" class="clockGroup" style="position:absolute; display:none; top:2px; z-index: 7; left: ' + (clockLeft+2) + 'px; padding-top:' + (timerFontSize*0.8) + 'px; width:' + (clockWidth-4) + 'px; height:' + (clockWidth-4) + 'px; border-radius:50%; color:white; text-align:center; background: radial-gradient(#ebb40e, #6a3c00);"></div> \
                              <div id="clockFG" class="clockGroup" style="position:absolute; top:2px; z-index: 8; left: ' + (clockLeft+2) + 'px; padding-top:' + (timerFontSize*0.8) + 'px; width:' + (clockWidth-4) + 'px; height:' + (clockWidth-4) + 'px; border-radius:50%; color:white; text-align:center; background-color: #00000000;"> \
                                  <div id="clock" style="position: relative; z-index:10; font-weight:bold; font-size: ' + timerFontSize + 'px; font-family:\'IBM Plex Sans\';">0:00</div> \
                                  <div id="clockBar" style="position:relative; z-index:10; margin-top:' + scoreboardHeight/12 + 'px; left:' + scoreboardHeight/6 + 'px; max-width:' + clockBarWidth + 'px; width:' + clockBarWidth + 'px; height:3px; background-color:#41f977"></div> \
                              </div> \
                              <div id="redScore" class="clockGroup redscore" style="position:absolute; top:'+ scoreTopPos + 'px; left:'+ redScoreLeftPos + 'px; width:'+ scoreWidth + 'px; height:'+ scoreboardLineHeight + 'px; line-height:'+ scoreboardLineHeight + 'px; font-weight:bold; text-align:right; font-size: ' + scoreFontSize + 'px;">0</div> \
                              <div id="blueScore" class="clockGroup bluescore" style="position:absolute; top:'+ scoreTopPos + 'px; left:'+ blueScoreLeftPos + 'px; width:'+ scoreWidth + 'px; height:'+ scoreboardLineHeight + 'px; line-height:'+ scoreboardLineHeight + 'px; font-weight:bold; text-align:left; font-size: ' + scoreFontSize + 'px;">0</div> \
                              <div id="redTeam" style="position:absolute; font-family: \'IBM Plex Sans\'; opacity:0; top:'+ (teamTop+(scoreboardLineHeight/2)) + 'px; left:'+ redTeamLeftPos + 'px; width:'+ teamWidth + 'px; height:0px; line-height:'+ scoreboardLineHeight/2 + 'px; color: #f62757; font-weight:bold; text-align:right; font-size: ' + teamFontSize + 'px;">' + redTeamName + '</div> \
                              <div id="blueTeam" style="position:absolute; font-family: \'IBM Plex Sans\'; opacity:0; top:'+ (teamTop+(scoreboardLineHeight/2)) + 'px; left:'+ blueTeamLeftPos + 'px; width:'+ teamWidth + 'px; height:0px; line-height:'+ scoreboardLineHeight/2 + 'px; color: #31cfda; font-weight:bold; text-align:left; font-size: ' + teamFontSize + 'px;">' + blueTeamName + '</div> \
                              <div id="redHold" style="position:absolute; z-index:3; font-family: \'IBM Plex Sans\'; color:white; font-weight:bold; font-size:' + scoreboardLineHeight*0.3 + 'px; opacity:0.25; top:'+ (scoreboardLineHeight+2) + 'px; left:'+ ((scoreboardWidth/2)-(clockWidth/2)-(indicatorFullWidth*2)) + 'px; width:' + indicatorFullWidth + 'px; height:' + indicatorHeight + 'px; line-height:' + scoreboardLineHeight/2 + 'px; text-align:left;">HOLD &nbsp;&nbsp;<span id="redHoldTime"></span></div> \
                              <div id="redReturner" style="position:absolute; display:none; z-index:4; font-family: \'IBM Plex Sans\'; color:white; font-weight:bold; font-size:' + scoreboardLineHeight*0.3 + 'px; opacity:0.25; top:'+ (scoreboardLineHeight+2) + 'px; left:'+ ((scoreboardWidth/2)-(clockWidth/2)-indicatorFullWidth) + 'px; width:' + (indicatorFullWidth*2) + 'px; height:0px; line-height:' + scoreboardLineHeight/2 + 'px; text-align:left;">RETURN &nbsp;&nbsp;<span id="redReturnName"></span></div> \
                              <div id="redTeamIndicators" class="redIndicators" style="position:absolute; z-index:3; top:'+ (scoreboardLineHeight + 6) + 'px; left:'+ ((scoreboardWidth/2)-(clockWidth/2)-indicatorFullWidth) + 'px; width:'+ indicatorFullWidth + 'px; height:'+ indicatorHeight + 'px; line-height:'+ scoreboardLineHeight/2 + 'px;"> \
                                  <div id="red1" class="redIndicators playerIndicators" style="position:relative; float:right; z-index:3; margin-left:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#f62757, #a0214a); border: 1px solid #f62757; border-radius:50%;"></div>  \
                                  <div id="red2" class="redIndicators playerIndicators" style="position:relative; float:right; z-index:3; margin-left:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#f62757, #a0214a); border: 1px solid #f62757; border-radius:50%;"></div>  \
                                  <div id="red3" class="redIndicators playerIndicators" style="position:relative; float:right; z-index:3; margin-left:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#f62757, #a0214a); border: 1px solid #f62757; border-radius:50%;"></div>  \
                                  <div id="red4" class="redIndicators playerIndicators" style="position:relative; float:right; z-index:3; margin-left:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#f62757, #a0214a); border: 1px solid #f62757; border-radius:50%;"></div>  \
                              </div> \
                              <div id="blueHold" style="position:absolute; z-index:3; font-family: \'IBM Plex Sans\'; color:white; font-weight:bold; font-size:' + scoreboardLineHeight*0.3 + 'px; opacity:0.25; top:'+ (scoreboardLineHeight+2) + 'px; left:'+ ((scoreboardWidth/2)+(clockWidth/2)+indicatorFullWidth) + 'px; width:' + indicatorFullWidth + 'px; height:' + indicatorHeight + 'px; line-height:' + scoreboardLineHeight/2 + 'px; text-align:right;"><span id="blueHoldTime"></span>&nbsp;&nbsp; HOLD</div> \
                              <div id="blueReturner" style="position:absolute; display:none; z-index:4; font-family: \'IBM Plex Sans\'; color:white; font-weight:bold; font-size:' + scoreboardLineHeight*0.3 + 'px; opacity:0.25; top:'+ (scoreboardLineHeight+2) + 'px; left:'+ ((scoreboardWidth/2)+(clockWidth/2)-indicatorFullWidth) + 'px; width:' + (indicatorFullWidth*2) + 'px; height:0px; line-height:' + scoreboardLineHeight/2 + 'px; text-align:right;"><span id="blueReturnName"></span>&nbsp;&nbsp; RETURN</div> \
                              <div id="blueTeamIndicators" class="blueIndicators" style="position:absolute; z-index:3; top:'+ (scoreboardLineHeight + 6) + 'px; left:' + ((scoreboardWidth/2)+(clockWidth/2)) + 'px; width:'+ indicatorFullWidth + 'px; height:'+ indicatorHeight + 'px; line-height:'+ scoreboardLineHeight/2 + 'px;"> \
                                  <div id="blue1" class="blueIndicators playerIndicators" style="position:relative; float:left; z-index:3; margin-right:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#31cfda, #119fac); border: 1px solid #31cfda; border-radius:50%;"></div>  \
                                  <div id="blue2" class="blueIndicators playerIndicators" style="position:relative; float:left; z-index:3; margin-right:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#31cfda, #119fac); border: 1px solid #31cfda; border-radius:50%;"></div>  \
                                  <div id="blue3" class="blueIndicators playerIndicators" style="position:relative; float:left; z-index:3; margin-right:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#31cfda, #119fac); border: 1px solid #31cfda; border-radius:50%;"></div>  \
                                  <div id="blue4" class="blueIndicators playerIndicators" style="position:relative; float:left; z-index:3; margin-right:' + (indicatorHeight/2) + 'px; width: ' + indicatorHeight + 'px; height: ' + indicatorHeight + 'px; background-image: linear-gradient(#31cfda, #119fac); border: 1px solid #31cfda; border-radius:50%;"></div>  \
                              </div> \
                          </div>';
        element.insertAdjacentHTML('afterend', newElement);

        if (showTeamNames) {
            $("#redTeam").css({opacity: 0.8, top: teamTop, height: scoreboardLineHeight/2});
            $("#blueTeam").css({opacity: 0.8, top: teamTop, height: scoreboardLineHeight/2});
        }

        getMapName();

        element = document.getElementsByTagName('head');
        newElement = "<style>.redscore{font-family: \'IBM Plex Sans\'; \
                         background: -webkit-linear-gradient(#ffffff66, #f62757ff); \
                         -webkit-background-clip: text;\
                         -webkit-text-fill-color: transparent;</style> \
                      <style>.bluescore{font-family: \'IBM Plex Sans\'; \
                         background: -webkit-linear-gradient(#ffffff66, #31cfdaff); \
                         -webkit-background-clip: text;\
                         -webkit-text-fill-color: transparent;</style> \
                      <link rel='preconnect' href='https://fonts.googleapis.com'> \
                      <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin> \
                      <link href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap' rel='stylesheet'>";
        element[0].insertAdjacentHTML('afterend', newElement);

        createGameLengthInput();
        whichGameMode();

        // update timer text
        requestAnimationFrame(function updateTimerText() {
            requestAnimationFrame(updateTimerText);
            updateTimer();
        });

        function hideSpectatorInfo1() {
            if (tagpro.ui.sprites.spectatorInfo1 != undefined) {
                setTimeout(function() {tagpro.ui.sprites.spectatorInfo1.visible = false;}, 0);
            } else {
                setTimeout(hideSpectatorInfo1, 200);
            }
        }
        function hideSpectatorInfo2() {
            if (tagpro.ui.sprites.spectatorInfo2 != undefined) {
                setTimeout(function() {tagpro.ui.sprites.spectatorInfo2.visible = false;}, 0);
            } else {
                setTimeout(hideSpectatorInfo2, 200);
            }
        }
        function hideRedScore() {
            if (tagpro.ui.sprites.redScore != undefined) {
                setTimeout(function() {tagpro.ui.sprites.redScore.visible = false;}, 0);
            } else {
                setTimeout(hideRedScore, 200);
            }
        }
        function hideBlueScore() {
            if (tagpro.ui.sprites.blueScore != undefined) {
                setTimeout(function() {tagpro.ui.sprites.blueScore.visible = false;}, 0);
            } else {
                setTimeout(hideBlueScore, 200);
            }
        }
        function hideChat() {
            document.getElementById("chatHistory").style.display = "none";
        }
        function hideTimer() {
            if (tagpro.ui.sprites.timer != undefined) {
                setTimeout(function() {tagpro.ui.sprites.timer.alpha = 0;}, 0);
            } else {
                setTimeout(hideTimer, 200);
            }
        }
        function hideMapInfo() {
            if (tagpro.ui.sprites.mapInfo != undefined) {
                setTimeout(function() {tagpro.ui.sprites.mapInfo.visible = false;}, 0);
            } else {
                setTimeout(hideMapInfo, 200);
            }
        }
        function hidePerformanceInfo() {
            if (tagpro.ui.sprites.performanceInfo != undefined) {
                setTimeout(function() {tagpro.ui.sprites.performanceInfo.alpha = 0;}, 0);
            } else {
                setTimeout(hidePerformanceInfo, 200);
            }
        }
        function hidePlayerIndicators() {
            if (tagpro.ui.sprites.playerIndicators != undefined) {
                setTimeout(function() {tagpro.ui.sprites.playerIndicators.visible = false;}, 0);
            } else {
                setTimeout(hidePlayerIndicators, 200);
            }
        }
        function hideBlueFlagIndicator() {
            if (tagpro.ui.sprites.blueFlag != undefined) {
                setTimeout(function() {tagpro.ui.sprites.blueFlag.alpha = 0;}, 0);
            } else {
                setTimeout(hideBlueFlagIndicator, 200);
            }
        }
        function hideRedFlagIndicator() {
            if (tagpro.ui.sprites.redFlag != undefined) {
                setTimeout(function() {tagpro.ui.sprites.redFlag.alpha = 0;}, 0);
            } else {
                setTimeout(hideRedFlagIndicator, 200);
            }
        }
        function hideYellowFlagIndicators() {
            if (tagpro.ui.sprites.yellowFlagTakenByBlue != undefined && tagpro.ui.sprites.yellowFlagTakenByRed != undefined) {
                setTimeout(function() {
                    tagpro.ui.sprites.yellowFlagTakenByBlue.alpha = 0;
                    tagpro.ui.sprites.yellowFlagTakenByRed.alpha = 0;
                }, 0);
            } else {
                setTimeout(hideYellowFlagIndicators, 200);
            }
        }
        function hideElements() {
            hideSpectatorInfo1();
            hideSpectatorInfo2();
            hideRedScore();
            hideBlueScore();
            //hideChat();
            hideTimer();
            hideMapInfo();
            hidePlayerIndicators();
            hideBlueFlagIndicator();
            hideRedFlagIndicator();
            hideYellowFlagIndicators();
            hidePerformanceInfo();
        }

        function createFontElement(num, size) {
            return '<div style="text-align:center; font-weight:bold; color:#ffffff; font-family:\'IBM Plex Sans\'; font-size:' + size + '">' + num + '</div>';
        }

        function assignTeams() {
            redPlayers = [];
            bluePlayers = [];
            for (var p in tagpro.players) {
                var player = tagpro.players[p];
                var returnsFound = false
                var howManyReturns = 0;
                for (var o in returns) {
                    if (player.id == returns[o][0]) {
                        returnsFound = true;
                        howManyReturns = returns[o][1];
                        if (player['s-returns'] > howManyReturns) {
                            if (player.team == 1) {
                                lastRedReturn = player.name;
                                lastRedReturnTime = Date.now();
                            } else {
                                lastBlueReturn = player.name;
                                lastBlueReturnTime = Date.now();
                            }
                        }
                        returns[o][1] = player['s-returns'];
                    }
                }
                if (returnsFound == false) {
                    returns.push([player.id, player['s-returns']]);
                }
                var playerDetails = [player.id, player.name, player.dead, player.jukeJuice, player.bomb, player.tagpro]
                if (player.team == 1) { // This player is on the red team
                    redPlayers.push(playerDetails);
                } else if (player.team == 2) {
                    bluePlayers.push(playerDetails);
                }
            }
        }

        function whichGameMode() {
            if (tagpro.map != undefined) {
                var map = tagpro.map;
                for (var t in map) {
                    for (var u in map[t]) {
                        if (map[t][u] == 16 || map[t][u] == 16.1) {
                            isCTF = false;
                            break;
                        }
                    }
                }
            } else {
                setTimeout(whichGameMode, 200);
            }
        }

        function animateRedCap() {
            if (Date.now() - lastRedReturnTime < 5000 && isCTF) {
                $("#redReturnName").html(lastRedReturn);
                setTimeout(() => {
                    $("#redReturner").show();
                    $("#redReturner").animate({height: indicatorHeight}, 300, "swing").delay(3200).animate({height: 0}, 300, "swing");
                }, 600);
                setTimeout(() => { $("#redReturner").hide(); $("#redReturnName").html(""); }, 4400);
            }
            var animationLength = 300;
            if (showTeamNames) {
                animationLength = 150;
                $("#blueTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 150, "swing");
                $("#redTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 150, "swing");
            }
            var capper = '';
            if (redHasFlag) {
                for (var a in tagpro.players) {
                    if (tagpro.players[a].id == redFC) { capper = tagpro.players[a].name; }
                }
                if (showTeamNames) {
                    setTimeout(() => {
                        $("#redTeam").html("<div id='c'><span id='c1'>C</span><span id='c2'>A</span><span id='c3'>P</span><span id='c4'>T</span><span id='c5'>U</span><span id='c6'>R</span><span id='c7'>E</span></div>");
                    }, 150);
                } else { $("#redTeam").html("<div id='c'><span id='c1'>C</span><span id='c2'>A</span><span id='c3'>P</span><span id='c4'>T</span><span id='c5'>U</span><span id='c6'>R</span><span id='c7'>E</span></div>"); }
            } else {
                for (var b in tagpro.players) {
                    if (tagpro.players[b].id == redLastFC) { capper = tagpro.players[b].name; }
                }
                if (isCTF) {
                    if (showTeamNames) {
                        setTimeout(() => {
                            $("#redTeam").html("<div id='c'><span id='c1'>C</span><span id='c2'>A</span><span id='c3'>P</span><span id='c4'>T</span><span id='c5'>U</span><span id='c6'>R</span><span id='c7'>E</span></div>");
                        }, 150);
                    } else { $("#redTeam").html("<div id='c'><span id='c1'>C</span><span id='c2'>A</span><span id='c3'>P</span><span id='c4'>T</span><span id='c5'>U</span><span id='c6'>R</span><span id='c7'>E</span></div>"); }
                } else {
                    if (showTeamNames) {
                        setTimeout(() => {
                            $("#redTeam").html("<div id='c'><span id='c1'>A</span><span id='c2'>S</span><span id='c3'>S</span><span id='c4'>I</span><span id='c5'>S</span><span id='c6'>T</span><span id='c7'></span></div>");
                        }, 150);
                    } else { $("#redTeam").html("<div id='c'><span id='c1'>A</span><span id='c2'>S</span><span id='c3'>S</span><span id='c4'>I</span><span id='c5'>S</span><span id='c6'>T</span><span id='c7'></span></div>"); }
                }
            }
            $("#redTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8, left: "+=" + capWidth}, animationLength, "swing", function() {
                setTimeout(() => { $("#c1").css("color","white"); }, 75 );
                setTimeout(() => { $("#c2").css("color","white"); }, 150 );
                setTimeout(() => { $("#c3").css("color","white"); }, 225 );
                setTimeout(() => { $("#c4").css("color","white"); }, 300 );
                setTimeout(() => { $("#c5").css("color","white"); }, 375 );
                setTimeout(() => { $("#c6").css("color","white"); }, 450 );
                setTimeout(() => { $("#c7").css("color","white"); }, 525 );
                setTimeout(() => { $("#c1").css("color",""); }, 150 );
                setTimeout(() => { $("#c2").css("color",""); }, 225 );
                setTimeout(() => { $("#c3").css("color",""); }, 300 );
                setTimeout(() => { $("#c4").css("color",""); }, 375 );
                setTimeout(() => { $("#c5").css("color",""); }, 450 );
                setTimeout(() => { $("#c6").css("color",""); }, 525 );
                setTimeout(() => { $("#c7").css("color",""); }, 600 );
                setTimeout(() => { $("#c").css("color","white"); }, 750 );
                setTimeout(() => { $("#c").css("color",""); }, 900 );
                setTimeout(() => { $("#c").css("color","white"); }, 1050 );
                setTimeout(() => { $("#c").css("color",""); }, 1200 );
                setTimeout(() => { $( this ).animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 300, "swing") }, 1700);
                setTimeout(() => { $("#c").html(capper); }, 2000);
                setTimeout(() => { $( this ).animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 300, "swing") }, 2000);

                setTimeout(() => { $( this ).animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0, left: "-=" + capWidth}, animationLength, "swing") }, 4400);
            });
            $(".playerIndicators").animate({height: 0, opacity: 0}, 200, "linear", function() {
                $( this ).delay(4600).animate({height: indicatorHeight, opacity: 1}, 200, "linear");
            });
            $("#blueHold").animate({height: 0, opacity: 0}, 200, "linear", function() {
                $("#blueHold").css({display: "none"});
                setTimeout(() => {
                    $( this ).show()
                    $( this ).animate({height: indicatorHeight, opacity: 0.25}, 200, "linear")
                }, 4600);
            });
            $(".clockGroup").animate({left: "+=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "-=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#blueGrabbed").animate({left: "+=" + capWidth, width: "-=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "-=" + capWidth, width: "+=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#blueTriangleGrabbed").animate({left: "-=0", width: "+=0"}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=0", width: "-=0"}, 300, "swing") }, 4400);
            });
            $("#redGrabbed").animate({width: "+=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({width: "-=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#redTriangleGrabbed").animate({left: "-=0", width: "+=0"}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=0", width: "-=0"}, 300, "swing") }, 4400);
            });
            $("#redScore").delay(200).animate({left: "+=" + clockWidth, opacity: 0}, 300, "swing", function() {
                setTimeout(() => {
                    $( this ).html(redScore);
                    $( this ).animate({left: "-=" + clockWidth, opacity: 1}, 300, "swing");
                }, 0);
            });

            if (showTeamNames) {
                animationLength = 150;
                setTimeout(() => {
                $("#redTeam").html(redTeamName);
                $("#redTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 150, "swing");
                $("#blueTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 150, "swing");
                }, 4850);
            } else {
                setTimeout(() => {
                    $("#redTeam").html(redTeamName);
                }, 4850);
            }

        }
        function animateBlueCap() {
            if (Date.now() - lastBlueReturnTime < 5000 && isCTF) {
                $("#blueReturnName").html(lastBlueReturn);
                setTimeout(() => {
                    $("#blueReturner").show();
                    $("#blueReturner").animate({height: indicatorHeight}, 300, "swing").delay(3200).animate({height: 0}, 300, "swing");
                }, 600);
                setTimeout(() => { $("#blueReturner").hide(); $("#blueReturnName").html(""); }, 4400);
            }
            var animationLength = 300;
            if (showTeamNames) {
                animationLength = 150;
                $("#blueTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 150, "swing");
                $("#redTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 150, "swing");
            }
            var capper = '';
            if (blueHasFlag) {
                for (var a in tagpro.players) {
                    if (tagpro.players[a].id == blueFC) { capper = tagpro.players[a].name; }
                }
                if (showTeamNames) {
                    setTimeout(() => {
                        $("#blueTeam").html("<div id='b'><span id='b1'>C</span><span id='b2'>A</span><span id='b3'>P</span><span id='b4'>T</span><span id='b5'>U</span><span id='b6'>R</span><span id='b7'>E</span></div>");
                    }, 150);
                } else { $("#blueTeam").html("<div id='b'><span id='b1'>C</span><span id='b2'>A</span><span id='b3'>P</span><span id='b4'>T</span><span id='b5'>U</span><span id='b6'>R</span><span id='b7'>E</span></div>"); }
            } else {
                for (var b in tagpro.players) {
                    if (tagpro.players[b].id == blueLastFC) { capper = tagpro.players[b].name; }
                }
                if (isCTF) {
                    if (showTeamNames) {
                        setTimeout(() => {
                            $("#blueTeam").html("<div id='b'><span id='b1'>C</span><span id='b2'>A</span><span id='b3'>P</span><span id='b4'>T</span><span id='b5'>U</span><span id='b6'>R</span><span id='b7'>E</span></div>");
                        }, 150);
                    } else { $("#blueTeam").html("<div id='b'><span id='b1'>C</span><span id='b2'>A</span><span id='b3'>P</span><span id='b4'>T</span><span id='b5'>U</span><span id='b6'>R</span><span id='b7'>E</span></div>"); }
                } else {
                    if (showTeamNames) {
                        setTimeout(() => {
                            $("#blueTeam").html("<div id='b'><span id='b1'>A</span><span id='b2'>S</span><span id='b3'>S</span><span id='b4'>I</span><span id='b5'>S</span><span id='b6'>T</span><span id='b7'></span></div>");
                        }, 150);
                    } else { $("#blueTeam").html("<div id='b'><span id='b1'>A</span><span id='b2'>S</span><span id='b3'>S</span><span id='b4'>I</span><span id='b5'>S</span><span id='b6'>T</span><span id='b7'></span></div>"); }
                }
            }
            $("#blueTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8, left: "-=" + capWidth}, animationLength, "swing", function() {
                setTimeout(() => { $("#b1").css("color","white"); }, 75 );
                setTimeout(() => { $("#b2").css("color","white"); }, 150 );
                setTimeout(() => { $("#b3").css("color","white"); }, 225 );
                setTimeout(() => { $("#b4").css("color","white"); }, 300 );
                setTimeout(() => { $("#b5").css("color","white"); }, 375 );
                setTimeout(() => { $("#b6").css("color","white"); }, 450 );
                setTimeout(() => { $("#b7").css("color","white"); }, 525 );
                setTimeout(() => { $("#b1").css("color",""); }, 150 );
                setTimeout(() => { $("#b2").css("color",""); }, 225 );
                setTimeout(() => { $("#b3").css("color",""); }, 300 );
                setTimeout(() => { $("#b4").css("color",""); }, 375 );
                setTimeout(() => { $("#b5").css("color",""); }, 450 );
                setTimeout(() => { $("#b6").css("color",""); }, 525 );
                setTimeout(() => { $("#b7").css("color",""); }, 600 );
                setTimeout(() => { $("#b").css("color","white"); }, 750 );
                setTimeout(() => { $("#b").css("color",""); }, 900 );
                setTimeout(() => { $("#b").css("color","white"); }, 1050 );
                setTimeout(() => { $("#b").css("color",""); }, 1200 );
                setTimeout(() => { $( this ).animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 300, "swing") }, 1700);
                setTimeout(() => { $("#b").html(capper); }, 2000);
                setTimeout(() => { $( this ).animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 300, "swing") }, 2000);

                setTimeout(() => { $( this ).animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0, left: "+=" + capWidth}, animationLength, "swing") }, 4400);
            });
            $(".playerIndicators").animate({height: 0, opacity: 0}, 200, "linear", function() {
                $( this ).delay(4600).animate({height: indicatorHeight, opacity: 1}, 200, "linear");
            });
            $("#redHold").animate({height: 0, opacity: 0}, 200, "linear", function() {
                $("#redHold").css({display: "none"});
                setTimeout(() => {
                    $( this ).show()
                    $( this ).animate({height: indicatorHeight, opacity: 0.25}, 200, "linear")
                }, 4600);
            });
            $(".clockGroup").animate({left: "-=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#blueGrabbed").animate({left: "-=" + capWidth, width: "+=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=" + capWidth, width: "-=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#blueTriangleGrabbed").animate({left: "-=0", width: "+=0"}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=0", width: "-=0"}, 300, "swing") }, 4400);
            });
            $("#redGrabbed").animate({width: "-=" + capWidth}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({width: "+=" + capWidth}, 300, "swing") }, 4400);
            });
            $("#redTriangleGrabbed").animate({left: "-=0", width: "+=0"}, 300, "swing", function() {
                setTimeout(() => { $( this ).animate({left: "+=0", width: "-=0"}, 300, "swing") }, 4400);
            });
            $("#blueScore").delay(200).animate({left: "-=" + clockWidth, opacity: 0}, 300, "swing", function() {
                setTimeout(() => {
                    $( this ).html(blueScore);
                    $( this ).animate({left: "+=" + clockWidth, opacity: 1}, 300, "swing");
                }, 0);
            });

            if (showTeamNames) {
                animationLength = 150;
                setTimeout(() => {
                    $("#blueTeam").html(blueTeamName);
                    $("#blueTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 150, "swing");
                    $("#redTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 150, "swing");
                }, 4850);
            } else {
                setTimeout(() => {
                    $("#blueTeam").html(blueTeamName);
                }, 4850);
            }

        }

        function updatePlayers() {
            for (var a = 0; a < 4; a++) {
                var divString = "#red" + (a+1);
                if (redPlayers.length > a) {
                    if (redPlayers[a][2]) {
                        $(divString).css("background-image","linear-gradient(#333333, #000000)");
                    } else if (redPlayers[a][5]) {
                        $(divString).css("background-image","linear-gradient(#41f977, #009a2c)");
                    } else if (redPlayers[a][4]) {
                        $(divString).css("background-image","linear-gradient(#eaa040, #6a3c00)");
                    } else if (redPlayers[a][3]) {
                        $(divString).css("background-image","linear-gradient(#b75fbd, #4f1053)");
                    } else { $(divString).css("background-image","linear-gradient(#f62757, #a0214a)"); }
                    $(divString).show();
                } else { $(divString).hide(); }

                divString = "#blue" + (a+1);
                if (bluePlayers.length > a) {
                    if (bluePlayers[a][2]) {
                        $(divString).css("background-image","linear-gradient(#333333, #000000)");
                    } else if (bluePlayers[a][5]) {
                        $(divString).css("background-image","linear-gradient(#41f977, #009a2c)");
                    } else if (bluePlayers[a][4]) {
                        $(divString).css("background-image","linear-gradient(#eaa040, #6a3c00)");
                    } else if (bluePlayers[a][3]) {
                        $(divString).css("background-image","linear-gradient(#b75fbd, #4f1053)");
                    } else { $(divString).css("background-image","linear-gradient(#31cfda, #119fac)"); }
                    $(divString).show();
                } else { $(divString).hide(); }
            }
        }

        function whoHasFlags() {
            var redFlagFound = false;
            var blueFlagFound = false;
            var yellowFlagFound = false;
            for(var p in tagpro.players) {
                var player = tagpro.players[p];
                if(player.flag) {
                    if (player.flag == 1) { // this player has the red flag
                        redFlagFound = true;
                        if (blueHasFlag) {
                            if (blueFC == player.id) {} else {
                                blueFC = player.id;
                                blueGrabTime = Date.now();
                            }
                        } else {
                            blueFC = player.id;
                            blueGrabbedFlag();
                        }
                    } else if (player.flag == 2) { // this player has the blue flag
                        blueFlagFound = true;
                        if (redHasFlag) {
                            if (redFC == player.id) {} else {
                                redFC = player.id;
                                redGrabTime = Date.now();
                            }
                        } else {
                            redFC = player.id;
                            redGrabbedFlag();
                        }
                    } else if (player.flag == 3) { // this player has the yellow flag
                        yellowFlagFound = true;
                        if (player.team == 1) { // this player is on the red team
                            if (redHasFlag) {
                                if (redFC == player.id) {} else {
                                    redFC = player.id;
                                    redGrabTime = Date.now();
                                }
                            } else {
                                redFC = player.id;
                                redGrabbedFlag();
                            }
                            if (blueHasFlag) { blueDroppedFlag(); }
                        } else { // this player is on the blue team
                            if (blueHasFlag) {
                                if (blueFC == player.id) {} else {
                                    blueFC = player.id;
                                    blueGrabTime = Date.now();
                                }
                            } else {
                                blueFC = player.id;
                                blueGrabbedFlag();
                            }
                            if (redHasFlag) { redDroppedFlag(); }
                        }
                    } // end flag conditionals
                }
            } // end player for loop
            if (isCTF) {
                if (yellowFlagFound == false && blueFlagFound == false && redHasFlag == true) { redDroppedFlag(); }
                if (yellowFlagFound == false && redFlagFound == false && blueHasFlag == true) { blueDroppedFlag(); }
            } else { // this is neutral flag
                if (redHasFlag && yellowFlagFound == false) { redDroppedFlag(); }
                if (blueHasFlag && yellowFlagFound == false) { blueDroppedFlag(); }
            }
        }

        function redGrabbedFlag() {
            if (redHasFlag) {} else {
                redHasFlag = true;
                redGrabTime = Date.now();
                $("#redGrabbed").fadeIn(200);
                $("#redTriangleGrabbed").fadeIn(200);
                $("#redHold").animate({opacity: 1}, 200);
                $("#redReturner").animate({opacity: 1}, 200);
            }
        }
        function blueGrabbedFlag() {
            if (blueHasFlag) {} else {
                blueHasFlag = true;
                blueGrabTime = Date.now();
                $("#blueGrabbed").fadeIn(200);
                $("#blueTriangleGrabbed").fadeIn(200);
                $("#blueHold").animate({opacity: 1}, 200);
                $("#blueReturner").animate({opacity: 1}, 200);
            }
        }
        function redDroppedFlag() {
            if (redHasFlag) {
                redHasFlag = false;
                redLastFC = redFC;
                redFC = "";
                $("#redGrabbed").fadeOut(200);
                $("#redTriangleGrabbed").fadeOut(200);
                $("#redHold").animate({opacity: 0.25}, 200);
                $("#redReturner").animate({opacity: 0.25}, 200);
            }
        }
        function blueDroppedFlag() {
            if (blueHasFlag) {
                blueHasFlag = false;
                blueLastFC = blueFC;
                blueFC = "";
                $("#blueGrabbed").fadeOut(200);
                $("#blueTriangleGrabbed").fadeOut(200);
                $("#blueHold").animate({opacity: 0.25}, 200);
                $("#blueReturner").animate({opacity: 0.25}, 200);
            }
        }

        function checkScores() {
            var scoreDiff = (tagpro.score.r - redScore) + (tagpro.score.b - blueScore);
            if (scoreDiff != 0) {
                if (scoreDiff == 1 && animateCaps) {
                    if (tagpro.score.r - redScore == 1) { animateRedCap(); redScore = tagpro.score.r; }
                    if (tagpro.score.b - blueScore == 1) { animateBlueCap(); blueScore = tagpro.score.b; }
                } else {
                    redScore = tagpro.score.r;
                    blueScore = tagpro.score.b;
                    document.getElementById("redScore").innerHTML = redScore;
                    document.getElementById("blueScore").innerHTML = blueScore;
                }
            }
        }

        function updatePing() {
            $("#fps").html(tagpro.fps);
            $("#ping").html(tagpro.ping.current);
            if (tagpro.ping.loss > 10) {
                $("#loss").html("| " + tagpro.ping.loss.toFixed(1) + "%");
            } else { $("#loss").html(""); }
        }

        function updateHold() {
            if (redHasFlag) {
                redHoldTime = Date.now() - redGrabTime;
                if (redHoldTime >= 2996) {
                    var min = (redHoldTime/1000/60) << 0;
                    var sec = fixSeconds(((redHoldTime/1000) % 60 << 0));
                    $("#redHoldTime").html(min + ":" + sec);
                } else {
                    $("#redHoldTime").html((redHoldTime/1000).toFixed(2));
                }
            }
            if (blueHasFlag) {
                blueHoldTime = Date.now() - blueGrabTime;
                if (blueHoldTime >= 2996) {
                    var min2 = (blueHoldTime/1000/60) << 0;
                    var sec2 = fixSeconds(((blueHoldTime/1000) % 60 << 0));
                    $("#blueHoldTime").html(min2 + ":" + sec2);
                } else {
                    $("#blueHoldTime").html((blueHoldTime/1000).toFixed(2));
                }
            }
        }

        function updateTimer() {
            if (tagpro.state == 1 || tagpro.state == 3 || tagpro.state == 5) {
                document.getElementById("clock").innerHTML = getTime();
            }
            whoHasFlags();
            assignTeams();
            updatePlayers();
            updateHold();
            checkScores();
            updatePing();
        }

        function getTime() {
            var millis = tagpro.gameEndsAt - Date.now();
            var sec, min, tenths = 0;
            var newClockBarWidth = millis * clockBarIncrement;
            $("#clockBar").width(newClockBarWidth);

            if (millis < 0) {
                if (tagpro.state == 5) { // overtime!
                    if (hasOvertimeStarted == false) {
                        $("#clockGoldColor").fadeIn(1000);
                        hasOvertimeStarted = true;
                    }
                    millis = millis * -1;
                    min = (millis/1000/60) << 0;
                    sec = fixSeconds(((millis/1000) % 60 << 0));
                    $("#clock").css("color","#ffffff");
                    $("#clockBorder").css("background-image","linear-gradient(to bottom, #cccccc, #ebb40e)");
                    return "+" + min + ":" + sec + "<br />OT";
                } else {
                    $("#clock").css("color","#41f977");
                    $("#clockBorder").css("background-image","linear-gradient(to bottom, #cccccc, #41f977)");
                    return "0.0";
                }
            } else if (millis < 10000) { // under ten seconds to go
                sec = Math.floor(millis/1000);
                tenths = Math.floor((millis % 1000)/100);
                $("#clock").css("color","#f62757");
                $("#clockBar").css("background-color","#f62757");
                $("#clockBorder").css("background-image","linear-gradient(to bottom, #cccccc, #f62757)");
                return sec + "." + tenths;
            } else if (millis < 60000) { // under a minute to go
                sec = fixSeconds(((millis/1000) % 60 << 0));
                $("#clock").css("color","#cbdc00");
                $("#clockBar").css("background-color","#cbdc00");
                $("#clockBorder").css("background-image","linear-gradient(to bottom, #cccccc, #cbdc00)");
                return ":" + sec;
            } else {
                min = (millis/1000/60) << 0;
                sec = fixSeconds(((millis/1000) % 60 << 0));
                $("#clock").css("color","#ffffff");
                $("#clockBar").css("background-color","#41f977");
                $("#clockBorder").css("background-image","linear-gradient(to bottom, #cccccc, #41f977)");
                return min + ":" + sec;
            }
        }

        function fixSeconds(seconds) {
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            return seconds;
        }


        function createGameLengthInput() {
            var element = document.getElementById("scoreboard");

            var newElement = '<button id="settingsToggle" style="border:none; margin:5px; margin-left:10px; margin-right:10px; padding:5px; font-family:\'IBM Plex Sans\'; font-size: 14px; background-color:#22222288; z-index:10; width:90px;">UI Options</button> \
                              <div id="uiSettings" style="display:none; margin:5px; margin-left:10px; padding:5px; font-family:\'IBM Plex Sans\'; font-size: 12px; background-color:#22222288; z-index:10; width:90px;"> \
                                <label for="gameLengthInput">Game Length  </label><br /><input id="gameLengthInputBox" type="number" min="1" max="20" style="background-color: black; color:white; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:50px;" name="gameLengthInput" value="' + gameLength + '"/><br /> \
                                <br /><button id="teamNameToggle" style="background-color: #333333; margin-bottom:2px; font-size: 8px; color:#white; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:80px;"></button><br /> \
                                <div id="teamNames"> \
                                  <input id="redTeamInputBox" type="text" maxlength="10" style="background-color: black; color:#f62757; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:80px;" name="redTeamInput" value="' + redTeamName + '"/><br /> \
                                  <input id="blueTeamInputBox" type="text" maxlength="10" style="background-color: black; color:#31cfda; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:80px;" name="blueTeamInput" value="' + blueTeamName + '"/><br /> \
                                  <button id="switchTeams" style="background-color: #333333; margin-bottom:2px; font-size: 8px; color:#white; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:80px;">Switch Names</button><br /> \
                                </div> \
                                <br /><button id="capAnimationsToggle" type="checkbox" style="background-color: #333333; margin-bottom:2px; font-size: 8px; color:#white; border:1px solid #444444; padding-left:8px; border-radius: 10px; width:80px;"></button><br /> \
                              </div>';
            element.insertAdjacentHTML( 'afterend', newElement );

            if (showTeamNames) {
                $("#teamNameToggle").html("Team Names On").css({color: "#41f977"});
                $("#teamNames").show();
            } else {
                $("#teamNameToggle").html("Team Names Off").css({color: "#f62757"});
                $("#teamNames").hide();
            }
            if (animateCaps) {
                $("#capAnimationsToggle").html("Cap Animations On").css({color: "#41f977"});
            } else { $("#capAnimationsToggle").html("Cap Animations Off").css({color: "#f62757"}); }

            document.getElementById('gameLengthInputBox').addEventListener('input', function() {
               gameLength = document.getElementById('gameLengthInputBox').value;
               clockBarIncrement = clockBarWidth / (gameLength * 60000);
            });

            document.getElementById('redTeamInputBox').addEventListener('input', function() {
               redTeamName = document.getElementById('redTeamInputBox').value;
               $("#redTeam").html(redTeamName);
            });

            document.getElementById('blueTeamInputBox').addEventListener('input', function() {
               blueTeamName = document.getElementById('blueTeamInputBox').value;
               $("#blueTeam").html(blueTeamName);
            });

            document.getElementById('settingsToggle').addEventListener('click', function() {
                if ( $("#uiSettings").is(":visible")){
                    $("#uiSettings").slideUp(500);
                } else { $("#uiSettings").slideDown(500); }
            });

            document.getElementById('teamNameToggle').addEventListener('click', function() {
                if (showTeamNames) {
                    $("#teamNameToggle").html("Team Names Off").css({color: "#f62757"});
                    $("#teamNames").slideUp(500);
                    $("#blueTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 300, "swing");
                    $("#redTeam").animate({height: 0, top: (teamTop+(scoreboardLineHeight/2)), opacity: 0}, 300, "swing");
                    showTeamNames = false;
                } else {
                    $("#teamNameToggle").html("Team Names On").css({color: "#41f977"});
                    $("#teamNames").slideDown(500);
                    $("#redTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 300, "swing");
                    $("#blueTeam").animate({height: scoreboardLineHeight/2, top: teamTop, opacity: 0.8}, 300, "swing");
                    showTeamNames = true;
                }
            });

            document.getElementById('capAnimationsToggle').addEventListener('click', function() {
                if (animateCaps) {
                    $("#capAnimationsToggle").html("Cap Animations Off").css({color: "#f62757"});
                    animateCaps = false;
                } else {
                    $("#capAnimationsToggle").html("Cap Animations On").css({color: "#41f977"});
                    animateCaps = true;
                }
            });

            document.getElementById('switchTeams').addEventListener('click', function() {
                var temp = redTeamName;
                redTeamName = blueTeamName;
                blueTeamName = temp;
                document.getElementById('redTeamInputBox').value = redTeamName;
                document.getElementById('blueTeamInputBox').value = blueTeamName;
                $("#redTeam").html(redTeamName);
                $("#blueTeam").html(blueTeamName);
            });

        }

    });

    //////////////////////////////////
    // JQUERY COOKIE PLUGIN FOLLOWS //
    //////////////////////////////////
/*
    (function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD (Register as an anonymous module)
		define(['jquery'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		module.exports = factory(require('jquery'));
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}

	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}

	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}

	function parseCookieValue(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape...
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}

	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return $.isFunction(converter) ? converter(value) : value;
	}

	var config = $.cookie = function (key, value, options) {

		// Write

		if (arguments.length > 1 && !$.isFunction(value)) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setMilliseconds(t.getMilliseconds() + days * 864e+5);
			}

			return (document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// Read

		var result = key ? undefined : {},
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling $.cookie().
			cookies = document.cookie ? document.cookie.split('; ') : [],
			i = 0,
			l = cookies.length;

		for (; i < l; i++) {
			var parts = cookies[i].split('='),
				name = decode(parts.shift()),
				cookie = parts.join('=');

			if (key === name) {
				// If second argument (value) is a function it's a converter...
				result = read(cookie, value);
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if (!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		// Must not alter options, thus extending a fresh object...
		$.cookie(key, '', $.extend({}, options, { expires: -1 }));
		return !$.cookie(key);
	};

}));
*/
});
