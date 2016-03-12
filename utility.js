function Message(protocol, delay, message){
   this.protocol = protocol;
   this.timeStamp = Date.now();
   this.delay = delay;
   this.message = message;
   this.sendTime = this.timeStamp + this.delay;
   this.asString = "Message using protocol: " + this.protocol + " generated at " + String(this.timeStamp) + " with latency delay " + String(delay);
}

function updateMsgTime(msg){
   msg.timeStamp = Date.now();
}

function packMsg(msg, delay){
   msg.delay = delay;
   return{"actionTime" : msg.timeStamp + msg.delay, "msg" : msg};
}

function millisToTime(millis){
   var date = new Date(millis);
   var str = '';
   str += date.getUTCHours() + "h:";
   str += date.getUTCMinutes() + "m:";
   str += date.getUTCSeconds() + "s:";
   str += date.getUTCMilliseconds() + "millis";
   return str;
}

function MessageLogger(name, nameColor, elementId){
   this.name = name;
   this.nameColor = nameColor;
   this.element = $("#" + elementId);

   this.logSend = function(msg, reciever){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>sent message to ' + reciever + ' at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> containing:</span> <span class="message">'
         + msg.message + '</span></div>');
      this.scrollDown();
   }

   this.logRecv = function(msg, sender){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>recieved message from ' + sender +' at </span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> containing:</span> <span class="message">'
         + msg.message + '</span></div>');
      this.scrollDown();
   }

   this.logSendWait = function(msg){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>out wait list at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> delay</span> <span class="delay">' 
         + String(msg.delay) + '</span> <span> containing:</span> <span class="message">'
         + msg.message + '</span></div>');
      this.scrollDown();
   }

   this.logRecvWait = function(msg){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>in wait list at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> delay</span> <span class="delay">' 
         + String(msg.delay) + '</span> <span> containing:</span> <span class="message">'
         + msg.message + '</span></div>');
      this.scrollDown();
   }

   this.scrollDown = function(){
      this.element.scrollTop(this.element[0].scrollHeight);
   }
}