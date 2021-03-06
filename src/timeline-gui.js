//  Timeline.js v0.1 / 2011-05-01       
//  A compact JavaScript animation library with a GUI timeline for fast editing.
//  by Marcin Ignac (http://marcinignac.com) 
//  
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.      

Timeline.prototype.initGUI = function() {  
	var self = this;     
	
	this.trackLabelWidth = 108;  
	this.trackLabelHeight = 20; 
	this.tracksScrollWidth = 16;  
	this.tracksScrollHeight = 0;
	this.tracksScrollThumbPos = 0;   
	this.tracksScrollThumbHeight = 0; 
	this.tracksScrollY = 0;    
	this.timeScrollWidth = 0;  
	this.timeScrollHeight = 16;
	this.timeScrollThumbPos = 0;   
	this.timeScrollThumbWidth = 0;   
	this.timeScrollX = 0;
	this.headerHeight = 30;
	this.canvasHeight = 200; 
	this.draggingTime = false;    
	this.draggingTracksScrollThumb = false;    
	this.draggingTimeScrollThumb = false;
	this.draggingKeys = false;
	this.draggingTimeScale = false;
	
	this.boundingBoxStartDrag = null;
	this.rotateStartDrag = null;
	
	this.selectedKeys = [];  
	this.timeScale = 1;    
	this.editHistory = [];
	
	this.mousePosition = {x: 0, y:0}; //this is the mouse position relative to the keys ui
	this.canvasMousePosition = {x: 0, y:0}; //this is the mouse position relative to the keys ui
	this.shiftPressed = false;
	
	//remove for save to be enabled...
	this.debug = true;
	    
	this.trackNameCounter = 0; 
	this.initTracks();
	this.load();    
	
	this.container = document.createElement("div");  
	this.container.style.width = "100%";    
	this.container.style.height = this.canvasHeight + "px";
	this.container.style.background = "#EEEEEE";	
	this.container.style.position = "fixed";		   
	this.container.style.left = "0px";      	   
	this.container.style.bottom = "0px";      	   
	document.body.appendChild(this.container);     
  
	this.splitter = document.createElement("div");
	this.splitter.style.width = "100%";       
	this.splitter.style.height = "4px";
	this.splitter.style.cursor = "ns-resize";
	this.splitter.style.position = "fixed";	  
	this.splitter.style.left = "0px";	  
	this.splitter.style.bottom = (this.canvasHeight - 2) + "px";   
	this.splitter.addEventListener("mousedown", function() {
	  function mouseMove(e) {         
	    var h = (window.innerHeight - e.clientY);  
	    self.splitter.style.bottom = (h - 2) + "px";
	    self.container.style.height = h + "px";
	    self.canvasHeight = h;     	                                     
	    self.tracksScrollY = 0;   
	    self.tracksScrollThumbPos = 0;
      self.save();
	  } 
	  function mouseUp(e) {
	    document.body.removeEventListener("mousemove", mouseMove, false);
  	  document.body.removeEventListener("mouseup", mouseUp, false);
	  }                                                  
	  document.body.addEventListener("mousemove", mouseMove, false);
	  document.body.addEventListener("mouseup", mouseUp, false);
	}, false)          
  document.body.appendChild(this.splitter);
  
	this.canvas = document.createElement("canvas");		 
	this.c = this.canvas.getContext("2d");
	this.canvas.width = 0;    
	this.container.appendChild(this.canvas);

	
	this.buildInputDialog();
	
	var self = this;
	
	this.canvas.addEventListener('click', function(event) {
		self.onMouseClick(event);
	}, false);
	
	this.canvas.addEventListener('mousedown', function(event) {
		self.onMouseDown(event);
	}, false);
	document.body.addEventListener('mousemove', function(event) {
		self.onDocumentMouseMove(event);
	}, false);
	this.canvas.addEventListener('mousemove', function(event) {
		self.onCanvasMouseMove(event);
	}, false);
	document.body.addEventListener('mouseup', function(event) {
		self.onMouseUp(event);
	}, false);  
	this.canvas.addEventListener('dblclick', function(event) {
		self.onMouseDoubleClick(event);
	}, false);
  
	
	//scrollbars
	$(this.canvas).bind('mouseenter mouseleave', function() { $('body').css('overflow-y', 'auto') });
	$(this.canvas).bind('mouseenter', function() { $('body').css('overflow-y', 'hidden');});

  
	//Capture key presses (remember to use 'self' instead of 'this')
	window.addEventListener('keyup',function(evt){
		if (evt.keyCode == 46){ //delete key
			self.deleteSelectedKeys(); 
			self.rebuildSelectedTracks();
			self.hideKeyEditDialog();  		 
		}else if (evt.keyCode == 90){ // 'z' key
			var editObj = self.editHistory.pop();
			var track = editObj.track;
			for(var i=0; i<self.tracks.length; i++) {  
				if (self.tracks[i].id != track.id) {
				  continue;
				}          
				if (track.type == "property") { 			  
				    track.keys.push({
				      time: editObj.time,
				      value: editObj.value,          
				      easing: editObj.easing,
				      track: track
				    })      
				   
				  
				}
			}   
			self.rebuildTrackAnimsFromKeys(track);    		
			self.rebuildSelectedTracks();
			self.hideKeyEditDialog();  	
		}else if (evt.keyCode == 16){  //SHIFT KEY
			self.shiftPressed = false;
		}
		
	
	
	},true);
	
	window.addEventListener('keydown',function(evt){
		if (evt.keyCode == 16){ //shift key down
			self.shiftPressed = true;
		}
	},true);
	
	
	//check if shift key is down or not
	$(document).bind('keyup keydown', function(e){this.shiftPressed = e.shiftKey} );

          
}    


//get the position of the mouse relative to the timeline
Timeline.prototype.updateMousePosition = function(event) {
	this.mousePosition.x = event.pageX;
	this.mousePosition.y = event.pageY;
	
	this.canvasMousePosition.x = event.clientX;
	this.canvasMousePosition.y = event.clientY - this.splitter.offsetTop-2;
}                                             

Timeline.prototype.onMouseDown = function(event) {   
  
  this.updateMousePosition(event);
  
  this.selectedKeys = [];    
  
  var x = this.canvasMousePosition.x;
  var y = this.canvasMousePosition.y;
  
  if (this.canvasMousePosition.x > this.trackLabelWidth && this.canvasMousePosition.y < this.headerHeight) {
    //timeline
    this.draggingTime = true; 
    this.onCanvasMouseMove(event);
  }             
  else if (this.canvasMousePosition.x > this.canvas.width - this.tracksScrollWidth && this.canvasMousePosition.y > this.headerHeight) {  
    //tracks scroll
    if (this.canvasMousePosition.y >= this.headerHeight + this.tracksScrollThumbPos && this.canvasMousePosition.y <= this.headerHeight + this.tracksScrollThumbPos + this.tracksScrollThumbHeight) {
      this.tracksScrollThumbDragOffset = this.canvasMousePosition.y - this.headerHeight - this.tracksScrollThumbPos;
      this.draggingTracksScrollThumb = true;
    }
  }
  else if (this.canvasMousePosition.x > this.trackLabelWidth && this.canvasMousePosition.y > this.headerHeight && this.canvasMousePosition.y < this.canvasHeight - this.timeScrollHeight) {
    //keys
    this.selectKeys(this.canvasMousePosition.x, this.canvasMousePosition.y);
    if (this.selectedKeys.length > 0) {
      this.draggingKeys = true;
    }else{
    	this.boundingBoxStartDrag = {"x":this.canvasMousePosition.x,"y": this.canvasMousePosition.y}
    }       
    this.cancelKeyClick = false;
  }       
  else if (this.canvasMousePosition.x < this.trackLabelWidth && this.canvasMousePosition.y > this.canvasHeight - this.timeScrollHeight) {         
    //time scale
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - this.canvasMousePosition.x) / this.trackLabelWidth, 1));
    this.draggingTimeScale = true;   
    this.save();
  }   
  else if (this.canvasMousePosition.x > this.trackLabelWidth && this.canvasMousePosition.y > this.canvasHeight - this.timeScrollHeight) {
    //time scroll   
    if (this.canvasMousePosition.x >= this.trackLabelWidth + this.timeScrollThumbPos && this.canvasMousePosition.x <= this.trackLabelWidth + this.timeScrollThumbPos + this.timeScrollThumbWidth) {
      this.timeScrollThumbDragOffset = this.canvasMousePosition.x - this.trackLabelWidth - this.timeScrollThumbPos;
      this.draggingTimeScrollThumb = true;
    }
  }
}

Timeline.prototype.onDocumentMouseMove = function(event) { 
  this.updateMousePosition(event);
  
  if (this.draggingTime) {
  	this.updateCss();
    this.time = this.xToTime(this.canvasMousePosition.x);
    var animationEnd = this.findAnimationEnd();
    if (this.time < 0) this.time = 0;
    if (this.time > animationEnd) this.time = animationEnd;  
    this.prevTime = this.time - 1/30; //FIXME: hardcoded frame delta 1/30
  }  
  if (this.draggingKeys) {
    for(var i=0; i<this.selectedKeys.length; i++) {
      var draggedKey = this.selectedKeys[i];
      draggedKey.time = Math.max(0, this.xToTime(this.canvasMousePosition.x));
      this.sortTrackKeys(draggedKey.track);
      this.rebuildSelectedTracks();
    } 
    this.cancelKeyClick = true;   
    this.timeScrollThumbPos = this.timeScrollX * (this.timeScrollWidth - this.timeScrollThumbWidth);  
  }    
  if (this.draggingTimeScale) {
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - this.canvasMousePosition.x) / this.trackLabelWidth, 1));    
    this.save();
  }
  
  if (this.rotateStartDrag != null){
  	
  	var mouseStartXFromCentre = this.rotateStartDrag.mouse.x - this.rotateStartDrag.elementPos.left;
  	var mouseStartYFromCentre = this.rotateStartDrag.mouse.y - this.rotateStartDrag.elementPos.top;
	mouseStartAngle = Math.atan2( mouseStartYFromCentre, mouseStartXFromCentre );
	
	var mouseXFromCentre = this.mousePosition.x - this.rotateStartDrag.elementPos.left;
	var mouseYFromCentre = this.mousePosition.y - this.rotateStartDrag.elementPos.top;
	var mouseAngle = Math.atan2( mouseYFromCentre, mouseXFromCentre );
	
	var rotateAngle = mouseAngle - mouseStartAngle;
	
	  $(this.rotateStartDrag.element).css('transform','rotate(' + rotateAngle + 'rad)');
	  $(this.rotateStartDrag.element).css('-moz-transform','rotate(' + rotateAngle + 'rad)');
	  $(this.rotateStartDrag.element).css('-webkit-transform','rotate(' + rotateAngle + 'rad)');
	  $(this.rotateStartDrag.element).css('-o-transform','rotate(' + rotateAngle + 'rad)');
	  $(this.rotateStartDrag.element).data('currentRotation', rotateAngle );
		
	console.log(rotateAngle);
  }
}

Timeline.prototype.onCanvasMouseMove = function(event) { 
  this.updateMousePosition(event);
   
  if (this.draggingTracksScrollThumb) {         
    this.tracksScrollThumbPos = this.canvasMousePosition.y - this.headerHeight - this.tracksScrollThumbDragOffset;
    if (this.tracksScrollThumbPos < 0) {
      this.tracksScrollThumbPos = 0;
    }
    if (this.tracksScrollThumbPos + this.tracksScrollThumbHeight > this.tracksScrollHeight) {
      this.tracksScrollThumbPos = Math.max(0, this.tracksScrollHeight - this.tracksScrollThumbHeight);    
    }                                              
    if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
      this.tracksScrollY = this.tracksScrollThumbPos/(this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }              
    else {
      this.tracksScrollY = 0;
    }                                                                                                         
  }   
  if (this.draggingTimeScrollThumb) {
    this.timeScrollThumbPos = this.canvasMousePosition.x - this.trackLabelWidth - this.timeScrollThumbDragOffset;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }  
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);    
    }  
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos/(this.timeScrollWidth - this.timeScrollThumbWidth);
    }              
    else {
      this.timeScrollX = 0;
    }
  } 
  

}              

Timeline.prototype.onMouseUp = function(event) {
  if (this.draggingTime) {
    this.draggingTime = false;
  }        
  if (this.draggingKeys) {
    this.draggingKeys = false;    
  }     
  if (this.draggingTracksScrollThumb) {
    this.draggingTracksScrollThumb = false;
  }        
  if (this.draggingTimeScale) {
    this.draggingTimeScale = false;
  }                     
  if (this.draggingTimeScrollThumb) {
    this.draggingTimeScrollThumb = false;   
  }
  if(this.boundingBoxStartDrag != null){
  	for(var i = 0; i < Math.abs(this.boundingBoxStartDrag.x - this.canvasMousePosition.x); i+=5)
  		for(var j = 0; j < Math.abs(this.boundingBoxStartDrag.y - this.canvasMousePosition.y); j+=5){
  			var keySearch = this.selectKeys(this.boundingBoxStartDrag.x+i,this.boundingBoxStartDrag.y+j);
  			if (keySearch != undefined)
  				console.log(keySearch); //temp for box select
  		}
  			  	
  	this.boundingBoxStartDrag = null;
  }
  
  this.rotateStartDrag = null;
}

Timeline.prototype.onMouseClick = function(event) {
	if (this.canvasMousePosition.x < 1*this.headerHeight - 4 * 0 && this.canvasMousePosition.y < this.headerHeight) {
		this.play();
	}                     
	if (this.canvasMousePosition.x > 1*this.headerHeight - 4 * 0 && this.canvasMousePosition.x < 2*this.headerHeight - 4 * 1 && this.canvasMousePosition.y < this.headerHeight) {
		
		this.pause();
		
		var timelineReference = this;
		
		for (var i = 0; i < this.targets.length; i++){
			$(this.targets[i].element).draggable({
				drag: function(event, ui){
					if (timelineReference.shiftPressed){ //if shift is pressed dont 
						
						timelineReference.rotateStartDrag = {
							mouse: {x:timelineReference.mousePosition.x,y:timelineReference.mousePosition.y},
							elementPos: $(this).offset(),
							element: this
						}
						
						
						
						return false;
					}
				},
			   stop: function(event, ui) {
			  		if (timelineReference.rotateStartDrag == null)
				   		for(var i = 0; i < timelineReference.tracks.length; i++){
				   			if (timelineReference.tracks[i].type == "property" && timelineReference.tracks[i].target.element == this){
				   			
				   				if (timelineReference.tracks[i].name == "x"){
				   					timelineReference.addKeyAt(timelineReference.tracks[i], timelineReference.time, parseInt(this.style.left));
				   					
				   				}
				   				if (timelineReference.tracks[i].name == "y"){
				   					timelineReference.addKeyAt(timelineReference.tracks[i], timelineReference.time, parseInt(this.style.top));	
				   					
				   				}
				   			}
				   		}
			   }
			});
		}
			
	}
	
	if (this.canvasMousePosition.x > 2*this.headerHeight - 4 * 1 && this.canvasMousePosition.x < 3*this.headerHeight - 4 * 2 && this.canvasMousePosition.y < this.headerHeight) {
		this.stop();
	}
	
	if (this.canvasMousePosition.x > 3*this.headerHeight - 4 * 2 && this.canvasMousePosition.x < 4*this.headerHeight - 4 * 3 && this.canvasMousePosition.y < this.headerHeight) {
		this.export();
	} 
	   
	//click on title
	if (this.canvasMousePosition.x < 4*this.headerHeight - 4 * 3 && this.canvasMousePosition.y > this.headerHeight) {
		
		var trackObject = this.getTrackAt(this.canvasMousePosition.x, this.canvasMousePosition.y);
		
		if (trackObject == null || trackObject.type != "object")
			return;
		
		trackObject.visible = !trackObject.visible;
	}   


	
	if (this.selectedKeys.length > 0 && !this.cancelKeyClick) {
		this.showKeyEditDialog(event.pageX, event.pageY);
	}  
}  

Timeline.prototype.onMouseDoubleClick = function(event) {
  var x = this.canvasMousePosition.x;
  var y = this.canvasMousePosition.y;
  
  if (x > this.trackLabelWidth && y < this.headerHeight) {
    //timeline
    var timeStr = prompt("Enter time") || "0:0:0"; 
    var timeArr = timeStr.split(":");
    var seconds = 0;
    var minutes = 0;  
    var hours = 0;
    if (timeArr.length > 0) seconds = parseInt(timeArr[timeArr.length-1]);
    if (timeArr.length > 1) minutes = parseInt(timeArr[timeArr.length-2]);
    if (timeArr.length > 2) hours = parseInt(timeArr[timeArr.length-3]);
    this.time = this.totalTime = hours * 60 * 60 + minutes * 60 + seconds;
  }
  else if (x > this.trackLabelWidth && this.selectedKeys.length == 0 && y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) {
    this.addKeyAt(this.getTrackAt(x, y), this.xToTime(x));
  }     
}                                           

Timeline.prototype.addKeyAt = function(selectedTrack, newTime, newValue) {

  if (!selectedTrack) {
    return;
  }
    
  var newKey = {
      time: newTime,
      value: selectedTrack.target[selectedTrack.propertyName],
      easing: Timeline.Easing.Linear.EaseNone,
      track: selectedTrack
  };
  	
  if (selectedTrack.keys.length == 0) {
    selectedTrack.keys.push(newKey);
  }
  else if (newKey.time < selectedTrack.keys[0].time) {
    newKey.value = selectedTrack.keys[0].value;  
    selectedTrack.keys.unshift(newKey);
  }    
  else if (newKey.time > selectedTrack.keys[selectedTrack.keys.length-1].time) {
    newKey.value = selectedTrack.keys[selectedTrack.keys.length-1].value;  
    selectedTrack.keys.push(newKey);  
  }
  else {
	  for(var i=1; i<selectedTrack.keys.length; i++) {  
	    if (selectedTrack.keys[i].time > newKey.time) {
	      var k = (selectedTrack.keys[i].time - newKey.time)/(selectedTrack.keys[i].time - selectedTrack.keys[i-1].time);  
	      var delta = selectedTrack.keys[i].value - selectedTrack.keys[i-1].value;
	      newKey.easing = selectedTrack.keys[i-1].easing;                    
	      newKey.value = selectedTrack.keys[i-1].value + delta * newKey.easing(k);
	      selectedTrack.keys.splice(i, 0, newKey);
	      break;
	    }    
	  }
  }
  
  if (newValue != undefined){
  	newKey.value = newValue;
  }
                   
  this.selectedKeys = [newKey];
  this.rebuildSelectedTracks();      
}                                                                                 

Timeline.prototype.getTrackAt = function(mouseX, mouseY) {

	var displayTracks = this.getDisplayedTracks();               
	var scrollY = this.tracksScrollY * (displayTracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
	var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY)/this.trackLabelHeight);
	                                             
	if (clickedTrackNumber >= 0 && clickedTrackNumber >= displayTracks.length) {    
	return null;
	}    
	
	return displayTracks[clickedTrackNumber];  
}

Timeline.prototype.selectKeys = function(mouseX, mouseY) {                         
  this.selectedKeys = [];
  
  var selectedTrack = this.getTrackAt(mouseX, mouseY);
  
  if (!selectedTrack || selectedTrack.type == "object") {
    return;
  }

  for(var i=0; i<selectedTrack.keys.length; i++) {
    var key = selectedTrack.keys[i];
    var x = this.timeToX(key.time);    
    
    if (x >= mouseX - this.trackLabelHeight*0.3 && x <= mouseX + this.trackLabelHeight*0.3) {
      this.selectedKeys.push(key);
      return(key); 
      break;
    }
  }    
}

Timeline.prototype.preUpdate = function() {
  this.updateGUI();
}                                                       

Timeline.prototype.updateGUI = function() {   
  if (!this.canvas) {    
    this.initGUI();    
  }                
  
  var displayTracks = this.getDisplayedTracks();
  this.canvas.width = window.innerWidth;
  this.canvas.height = this.canvasHeight;                    
  var w = this.canvas.width;
  var h = this.canvas.height;    
  
  this.tracksScrollHeight = this.canvas.height - this.headerHeight - this.timeScrollHeight;
  var totalTracksHeight = displayTracks.length * this.trackLabelHeight;
  var tracksScrollRatio = this.tracksScrollHeight/totalTracksHeight;
  this.tracksScrollThumbHeight = Math.min(Math.max(20, this.tracksScrollHeight * tracksScrollRatio), this.tracksScrollHeight);
  
  this.timeScrollWidth = this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth;
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(0); //100 to get some space after lask key
  var timeScrollRatio = Math.max(0, Math.min(visibleTime/animationEnd, 1));
  this.timeScrollThumbWidth = timeScrollRatio * this.timeScrollWidth; 
  if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
    this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);    
  }       
    
  
  this.c.clearRect(0, 0, w, h);   
                   
  //buttons  
  this.drawRect(0*this.headerHeight - 4 * -1, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD"); 
  this.drawRect(1*this.headerHeight - 4 *  0, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD"); 
  this.drawRect(2*this.headerHeight - 4 *  1, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD"); 
  this.drawRect(3*this.headerHeight - 4 *  2, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD"); 
  
  //play
  this.c.strokeStyle = "#777777";
  this.c.beginPath();
  this.c.moveTo(4 + 6.5, 5 + 5);
  this.c.lineTo(this.headerHeight - 8, this.headerHeight/2+1.5);
  this.c.lineTo(4 + 6.5, this.headerHeight - 8);
  this.c.lineTo(4 + 6.5, 5 + 5);
  this.c.stroke();                                                                                                  
  
  //pause  
  this.c.strokeRect(this.headerHeight + 5.5, 5 + 5.5, this.headerHeight/6, this.headerHeight - 8 - 11);
  this.c.strokeRect(this.headerHeight + 5.5 + this.headerHeight/6 + 2, 5 + 5.5, this.headerHeight/6, this.headerHeight - 8 - 11);
  
  //stop    
  this.c.strokeRect(2*this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);
  
  //export
  this.c.beginPath();
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 9.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 11.5, this.headerHeight - 9.5);
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 13.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 13.5, this.headerHeight - 13.5);
  this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 17.5);
  this.c.lineTo(3*this.headerHeight - 4 *  2 + 15.5, this.headerHeight - 17.5);
  this.c.stroke();
                                                                       
  //tracks area clipping path
  this.c.save();
  this.c.beginPath();
  this.c.moveTo(0, this.headerHeight+1);
  this.c.lineTo(this.canvas.width, this.headerHeight + 1);  


  this.c.lineTo(this.canvas.width, this.canvas.height - this.timeScrollHeight);  
  this.c.lineTo(0, this.canvas.height - this.timeScrollHeight);
  this.c.clip();
       
  for(var i=0; i<displayTracks.length; i++) { 
    var yshift = this.headerHeight + this.trackLabelHeight * (i + 1);
    var scrollY = this.tracksScrollY * (displayTracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight); 
    
    yshift -= scrollY;
    if (yshift < this.headerHeight) continue;
    
    this.drawTrack(displayTracks[i], yshift);     
  }     
  
  this.c.restore();                                                       
                                                                             
  //end of label panel
  this.drawLine(this.trackLabelWidth, 0, this.trackLabelWidth, h, "#000000");
    
  //timeline
                 
  var timelineStart = 0;
  var timelineEnd = 10; 
  var lastTimeLabelX = 0;   
                                                                                 
  this.c.fillStyle = "#666666";  
  var x = this.timeToX(0);
  //for(var sec=timelineStart; sec<timelineEnd; sec++) {                               
  var sec = timelineStart;
  while(x < this.canvas.width) {  
    x = this.timeToX(sec);
    this.drawLine(x, 0, x, this.headerHeight*0.3, "#999999"); 
               
    var minutes = Math.floor(sec / 60);
    var seconds = sec % 60;
    var time = minutes + ":" + ((seconds < 10) ? "0" : "") + seconds;
    
    if (x - lastTimeLabelX > 30) {
      this.c.fillText(time, x - 6, this.headerHeight*0.8);    
      lastTimeLabelX = x;
    }   
    sec += 1;
  }    
  
  //time ticker
  this.drawLine(this.timeToX(this.time), 0, this.timeToX(this.time), h, "#FF0000"); 
  
  //time scale
  
  for(var i=2; i<20; i++) {   
    var f = 1.0 - (i*i)/361;
    this.drawLine(7 + f*(this.trackLabelWidth-10), h - this.timeScrollHeight + 4, 7 + f*(this.trackLabelWidth - 10), h - 3, "#999999"); 
  }                                                                                                                                     
                     
  this.c.fillStyle = "#666666";
  this.c.beginPath();
  this.c.moveTo(7 + (1.0-this.timeScale)*(this.trackLabelWidth-10), h - 7);
  this.c.lineTo(11 + (1.0-this.timeScale)*(this.trackLabelWidth - 10), h - 1);
  this.c.lineTo(3 + (1.0-this.timeScale)*(this.trackLabelWidth - 10), h - 1);
  this.c.fill();
                                                                     
  //tracks scrollbar
  this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1, this.tracksScrollWidth, this.tracksScrollHeight, "#DDDDDD");
  if (this.tracksScrollThumbHeight < this.tracksScrollHeight) {
    this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1 + this.tracksScrollThumbPos, this.tracksScrollWidth, this.tracksScrollThumbHeight, "#999999");
  } 
  
  //time scrollbar
  this.drawRect(this.trackLabelWidth, h - this.timeScrollHeight, w - this.trackLabelWidth - this.tracksScrollWidth, this.timeScrollHeight, "#DDDDDD");  
  if (this.timeScrollThumbWidth < this.timeScrollWidth) {
    this.drawRect(this.trackLabelWidth + 1 + this.timeScrollThumbPos, h - this.timeScrollHeight, this.timeScrollThumbWidth, this.timeScrollHeight, "#999999");
  }
  
  //header borders
  this.drawLine(0, 0, w, 0, "#000000");  
  this.drawLine(0, this.headerHeight, w, this.headerHeight, "#000000");
  this.drawLine(0, h - this.timeScrollHeight, this.trackLabelWidth, h - this.timeScrollHeight, "#000000");
  this.drawLine(this.trackLabelWidth, h - this.timeScrollHeight - 1, this.trackLabelWidth, h, "#000000");
  
  //bounding box for selection
  if(this.boundingBoxStartDrag != null){
  	this.drawRect(this.boundingBoxStartDrag.x, this.boundingBoxStartDrag.y, this.canvasMousePosition.x - this.boundingBoxStartDrag.x , this.canvasMousePosition.y - this.boundingBoxStartDrag.y, "rgba(0, 0, 256, 0.2)");
  }
}     

Timeline.prototype.getDisplayedTracks = function() {   
  var displayTracks = [];
  for(var i=0; i<this.tracks.length; i++) { 
	if (this.tracks[i].type == "property")
		if (this.tracks[i].parent.visible == false) 
			continue;
    displayTracks.push(this.tracks[i]);     
  }   
  

  
  return displayTracks;
}   

Timeline.prototype.timeToX = function(time) {   
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(20); //50 to get some additional space
  if (visibleTime < animationEnd) {      
    time -= (animationEnd - visibleTime) * this.timeScrollX;
  }
  
  return this.trackLabelWidth + time * (this.timeScale * 200) + 10;
}     

Timeline.prototype.xToTime = function(x) {                                                    
  var animationEnd = this.findAnimationEnd();  
  var visibleTime = (this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth - 20)/(this.timeScale * 200);
  var timeShift = Math.max(0, (animationEnd - visibleTime) * this.timeScrollX);
  return (x - this.trackLabelWidth - 10)/(this.timeScale * 200) + timeShift;
}

Timeline.prototype.drawTrack = function(track, y) {        
  var xshift = 5;
  if (track.type == "object") {  
    //object track header background
    this.drawRect(0, y - this.trackLabelHeight + 1, this.trackLabelWidth, this.trackLabelHeight-1, "#555");    
    //label color
    this.c.fillStyle = "#fff";
  }                              
  else {                         
    xshift += 10;
    //label color    
    this.c.fillStyle = "#555555";
  }                                                       
  
  //bottom track line
  this.drawLine(0, y, this.canvas.width, y, "#FFFFFF");
  //draw track label
  this.c.fillText(track.name, xshift, y - this.trackLabelHeight/4);
                    
  //if it's property track then draw anims
  if (track.type == "property") {            
    for(var i=0; i<track.keys.length; i++) {      
      var key = track.keys[i];  
      var selected = false;
      if (this.selectedKeys.indexOf(key) > -1) {
        selected = true;
      }
      var first = (i == 0);
      var last = (i == track.keys.length - 1);
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, "#999999", true, true, selected ? "#0000FF" : "#666666");
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, this.trackLabelHeight*0.5, "#550055", !first, !last);      
    }
  }
}


Timeline.prototype.drawLine = function(x1, y1, x2, y2, color) { 
	this.c.strokeStyle = color;     
	this.c.beginPath();
	this.c.moveTo(x1+0.5, y1+0.5);
	this.c.lineTo(x2+0.5, y2+0.5);
	this.c.stroke();
}

Timeline.prototype.drawRect = function(x, y, w, h, color) {
	this.c.fillStyle = color;
	this.c.fillRect(x, y, w, h);  
} 

Timeline.prototype.drawCenteredRect = function(x, y, w, h, color) {
	this.c.fillStyle = color;
	this.c.fillRect(x-w/2, y-h/2, w, h);  
}

Timeline.prototype.drawRombus = function(x, y, w, h, color, drawLeft, drawRight, strokeColor) {
	this.c.fillStyle = color;       
	if (strokeColor) {     
	  this.c.lineWidth = 2;
    this.c.strokeStyle = strokeColor;
    this.c.beginPath();
    this.c.moveTo(x, y - h/2);
    this.c.lineTo(x + w/2, y); 
    this.c.lineTo(x, y + h/2);
    this.c.lineTo(x - w/2, y);
    this.c.lineTo(x, y - h/2);   
    this.c.stroke(); 
    this.c.lineWidth = 1;
  }   
	     
	if (drawLeft) {     
  	this.c.beginPath();
  	this.c.moveTo(x, y - h/2); 
  	this.c.lineTo(x - w/2, y);
    this.c.lineTo(x, y + h/2);  
    this.c.fill();   
  }  
  
  if (drawRight) {
    this.c.beginPath();
  	this.c.moveTo(x, y - h/2);    
    this.c.lineTo(x + w/2, y);  	
  	this.c.lineTo(x, y + h/2);  	
  	this.c.fill(); 
  }
}             

Timeline.prototype.initTracks = function() {
  this.tracks = [];   
  for(var i=0; i<this.anims.length; i++) {
    var anim = this.anims[i];   
    var objectTrack = null;
    var propertyTrack = null;
    for(var j=0; j<this.tracks.length; j++) {
      if (this.tracks[j].type == "object" && this.tracks[j].target == anim.target) {
        objectTrack = this.tracks[j];      
      } 
      if (this.tracks[j].type == "property" && this.tracks[j].target == anim.target && this.tracks[j].propertyName == anim.propertyName) {
        propertyTrack = this.tracks[j];      
      }
    }         
    if (!objectTrack) {  
      objectTrack = {       
        type: "object",
        id: anim.targetName,
        name: anim.targetName,
        target: anim.target,  
        visible: false,      
        propertyTracks: []
      };                         
      if (!objectTrack.name) {
        objectTrack.name = "Object" + this.trackNameCounter++;
      }                                          
      this.tracks.push(objectTrack);
    }        
    
    if (!propertyTrack) {
      propertyTrack = {    
        type: "property",
        id: objectTrack.name + "." + anim.propertyName, 
        name: anim.propertyName, 
        propertyName: anim.propertyName,  
        target: anim.target,
        parent: objectTrack,
        anims: []
      }   
      
      //find place to insert
      var parentObjectTrack = null;
      var nextObjectTrack = null;
      for(var k=0; k<this.tracks.length; k++) {
        if (this.tracks[k].type == "object") {     
          if (parentObjectTrack && !nextObjectTrack) {
            nextObjectTrack = this.tracks[k];
          }     
          if (this.tracks[k].target == propertyTrack.target) {
            parentObjectTrack = this.tracks[k];
          }          
        }
      }
                                                          
      if (nextObjectTrack) {  
        //add ad the end of this object property tracks, just before next one
        var nextTrackIndex = this.tracks.indexOf(nextObjectTrack);
        this.tracks.splice(nextTrackIndex, 0, propertyTrack);     
      } 
      else {                                 
        //add to end of all track
        this.tracks.push(propertyTrack);     
      }
      
      parentObjectTrack.propertyTracks.push(propertyTrack);  
      
    }   
    
    propertyTrack.anims.push(anim);    
  }      
    
  //convert anims to keys
  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    track.keys = [];
    if (track.type == "object") continue;
    for(var j=0; j<track.anims.length; j++) {
      var anim = track.anims[j];
      if (anim.delay > 0) {  
        var startValue = 0; 
        var easing = anim.easing;           
        if (j == 0) {
          startValue = track.target[track.propertyName];
        }                                        
        else {
          startValue = track.anims[j-1].endValue;
        }  
        track.keys.push({
           time: anim.startTime,
           value: startValue, 
           easing: easing,
           track: track,
        });    
      } 
      var easing = Timeline.Easing.Linear.EaseNone;
      if (j < track.anims.length - 1) {
        if (track.anims[j+1].delay == 0) {
          easing = track.anims[j+1].easing;
        }
      } 
      track.keys.push({
         time: anim.endTime,
         value: anim.endValue, 
         easing: easing,
         track: track         
      });
    }
  }
}      

Timeline.prototype.buildInputDialog = function() {  
  this.keyEditDialog = document.createElement("div");
  this.keyEditDialog.id = "keyEditDialog";
  this.keyEditDialog.style.cssText = "position:absolute; padding:5px; background: #DDDDDD; font-family:arial; font-size:11px; left: 100px; top:100px; border: 1px solid #AAAAAA; border-radius: 5px;";
  
  var easingOptions = "";
  
  for(var easingFunctionFamilyName in Timeline.Easing) {
    var easingFunctionFamily = Timeline.Easing[easingFunctionFamilyName];
    for(var easingFunctionName in easingFunctionFamily) {   
      easingOptions += "<option>" + easingFunctionFamilyName + "." + easingFunctionName + "</option>";
    }  
  }
    
  var controls = "";
  controls += '<label style="margin-right:10px">Value<input type="text" id="keyEditDialogValue"/></label>';
  controls += '<label style="margin-right:10px">Easing<select id="keyEditDialogEasing">'+easingOptions+'</label>';
 	controls += '<input id="keyEditDialogOK" style="margin-left: 10px; margin-right:10px" type="button" value="OK"/>';
 	controls += '<input id="keyEditDialogCancel" style="margin-right:10px" type="button" value="Cancel"/>';
 	controls += '<a id="keyEditDialogDelete" style="margin-right:5px" href="#">[x]</a>';
  this.keyEditDialog.innerHTML = controls;
  document.body.appendChild(this.keyEditDialog);   
  
  this.keyEditDialogValue = document.getElementById("keyEditDialogValue");
  this.keyEditDialogEasing = document.getElementById("keyEditDialogEasing");
  this.keyEditDialogOK = document.getElementById("keyEditDialogOK");
  this.keyEditDialogCancel = document.getElementById("keyEditDialogCancel");
  this.keyEditDialogDelete = document.getElementById("keyEditDialogDelete");
    
  var self = this;
  
  this.keyEditDialogOK.addEventListener('click', function() {
    self.applyKeyEditDialog();
    self.hideKeyEditDialog();
  }, false)
    
  this.keyEditDialogCancel.addEventListener('click', function() {
    self.hideKeyEditDialog();
  }, false)
  
  this.keyEditDialogDelete.addEventListener('click', function() {   
    self.deleteSelectedKeys(); 
    self.rebuildSelectedTracks();
    self.hideKeyEditDialog();
  }, false)
                             
  this.hideKeyEditDialog();
}   

Timeline.prototype.applyKeyEditDialog = function() {         
  var value = Number(this.keyEditDialogValue.value)
  if (isNaN(value)) {
    return;
  }                                                                  
  var selectedOption = this.keyEditDialogEasing.options[this.keyEditDialogEasing.selectedIndex];
  var easing = Timeline.easingMap[selectedOption.value] ;
  for(var i=0; i<this.selectedKeys.length; i++) {  
    this.selectedKeys[i].easing = easing;
    this.selectedKeys[i].value = value;
  }      
  this.rebuildSelectedTracks();     
}                     

Timeline.prototype.showKeyEditDialog = function(mouseX, mouseY) {
  this.keyEditDialogValue.value = this.selectedKeys[0].value;
  for(var i=0; i<this.keyEditDialogEasing.options.length; i++) {
    var option = this.keyEditDialogEasing.options[i];
    var easingFunction = Timeline.easingMap[option.value];
    if (easingFunction == this.selectedKeys[0].easing) {
      this.keyEditDialogEasing.selectedIndex = i;
      break;
    }
  }
  this.keyEditDialog.style.left = Math.max(50, mouseX - 200) + "px";
  this.keyEditDialog.style.top = (mouseY - 50) + "px";
  this.keyEditDialog.style.display = "block";   
  
  this.keyEditDialogValue.focus();
}     

Timeline.prototype.deleteSelectedKeys = function() {
	
	for(var i=0; i<this.selectedKeys.length; i++) {
		var selectedKey = this.selectedKeys[i];
		var keyIndex = selectedKey.track.keys.indexOf(selectedKey);
		var deletedKey = selectedKey.track.keys.splice(keyIndex, 1);
		this.editHistory.push(deletedKey[0]);
	}         
	this.rebuildSelectedTracks();
}

Timeline.prototype.hideKeyEditDialog = function() {         
  this.keyEditDialog.style.display = "none";  
}     

Timeline.prototype.sortTrackKeys = function(track) {
  track.keys.sort(function(a,b) { return a.time - b.time; });
  
  var result = "";
  for(var i=0; i<track.keys.length; i++) {
    result += track.keys[i].time + " ";
  }                                    
}                            

Timeline.prototype.rebuildSelectedTracks = function() {
  for(var i=0; i<this.selectedKeys.length; i++) {
    this.rebuildTrackAnimsFromKeys(this.selectedKeys[i].track);
  }     
  this.save();
}

Timeline.prototype.rebuildTrackAnimsFromKeys = function(track) {   
  
  //this is a label; end yo function
  if (track.anims == undefined)
  	return;
  	
  var deletedAnims = [];
                     
  //remove all track's anims from the timeline
  for(var j=0; j<track.anims.length; j++) {   
    var index = this.anims.indexOf(track.anims[j]);
    deletedAnims.push(track.anims[j]);
    this.anims.splice(index, 1);
  }
  
  //remove all anims from the track
  track.anims.splice(0, track.anims.length);

  if (track.keys.length == 0) {
    return;
  }        
  
  var delay = track.keys[0].time;  
  var prevKeyTime = track.keys[0].time;
  var prevKeyValue = track.keys[0].value;  
  var prevKeyEasing = Timeline.Easing.Linear.EaseNone;
  //create new anims based on keys
  for(var j=0; j<track.keys.length; j++) {  
    var key = track.keys[j];
    var anim = {
      timeline: this,
		  //targetName: track.parent.name,  //propertyTrack.objectTrack.targetName
		  target: track.target,
			propertyName: track.propertyName,                   
			startValue: prevKeyValue,
			endValue: key.value,
			delay: delay,
			startTime: prevKeyTime,
			endTime: key.time,
			easing: prevKeyEasing   
		};  			
		track.anims.push(anim);  
		this.anims.push(anim);
		delay = 0; 
		prevKeyTime = key.time; 
		prevKeyValue = key.value; 
		prevKeyEasing = key.easing;
  }                      
}
           
Timeline.prototype.export = function() {
  var code = "";
  
  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    if (track.type == "object") continue;
    if (track.anims.length == 0) continue;
    code += 'anim("' + track.parent.name + '",' + track.parent.name + ')';
    for(var j=0; j<track.anims.length; j++) {
      var anim = track.anims[j];   
      code += '.to(';
      if (anim.delay) 
        code += anim.delay + ',';
      code += '{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '}';      
      code += ',' + (anim.endTime - anim.startTime);                          
      if (anim.easing != Timeline.Easing.Linear.EaseNone) 
        code += ', Timeline.Easing.' + Timeline.easingFunctionToString(anim.easing);
      code += ')';
      //code += '.to(' + anim.delay + ',{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '} ')';
    }
    code += ';\n';
  }
    
  prompt("Copy this:", code);
}

Timeline.prototype.save = function() {    
  var data = {};
  
  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];
    var keysData = [];
    for(var j=0; j<track.keys.length; j++) {
  		keysData.push({
  			time: track.keys[j].time,     
  			value: track.keys[j].value,
  			easing: Timeline.easingFunctionToString(track.keys[j].easing),
  		});                                                            
  	}
  	data[track.id] = keysData;
  }      
  
  localStorage["timeline.js.settings.canvasHeight"] = this.canvasHeight;                              
  localStorage["timeline.js.settings.timeScale"] = this.timeScale;                              
  localStorage["timeline.js.data." + this.name] = JSON.stringify(data);
} 

Timeline.prototype.load = function() {      
  if (localStorage["timeline.js.settings.canvasHeight"]) {
    this.canvasHeight = localStorage["timeline.js.settings.canvasHeight"];                              
  }
  if (localStorage["timeline.js.settings.timeScale"]) {
    this.timeScale = localStorage["timeline.js.settings.timeScale"];                              
  }
   
  if (this.debug)
  	return;
   
  var dataString = localStorage["timeline.js.data." + this.name];
  if (!dataString) return;                 
  var data = JSON.parse(dataString);  
  for(var i=0; i<this.tracks.length; i++) {
    var track = this.tracks[i];    
    if (!data[track.id]) {
      continue;
    }          
    if (track.type == "property") { 
      var keysData = data[track.id];
      track.keys = [];                         
      for(var j=0; j<keysData.length; j++) {
        track.keys.push({
          time: keysData[j].time,
          value: keysData[j].value,          
          easing: Timeline.stringToEasingFunction(keysData[j].easing),
          track: track
        })      
      }  
      this.rebuildTrackAnimsFromKeys(track);    
    }
  }  
}    