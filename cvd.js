/**
 * cvd.js Canvas Drawer
 * @author Yuichiro SUGA
 * @since 2016-11-05
 * キャンバスはBackground, Canvas, Operationの3つのレイヤーから構成される。
 * Backgroundレイヤーでは、グリッド線および、作業中の背景色を描画する。
 * Canvasレイヤーには、使用者が描画したすべてのオブジェクトが描画される。
 * Operatoinレイヤーには、現在使用中のアイテムの動作が描画される。
 */

/*
 * jslint browser : true, continue : true, devel : true, idndent : 2, maxerr :
 * 50, newcap : true, nomen : true, plusplus : true, regexp : true, sloppy
 * :true, vars : false, white : true
 */

/* global $, cvd */
cvd = (function() {
  'use strict';
  // --Module Scope Variables BEGIN-------------------------------------------
  var
    // Configuration properties mapping
    configMap = {
      mainHtml      : String()
		+ '<canvas id="cvd-bcg" width="600" height="600"></canvas>'
        + '<canvas id="cvd-cvs" width="600" height="600"></canvas>'
		+ '<canvas id="cvd-opr" width="600" height="600"></canvas>'
		+ '<div id="cvd-tlp">'
			+	'<ul id="cd-tlp-pnl">'
				+	'<li id="cvd-tlp-pnl-brsh">Brush</li>'
				+	'<li id="cvd-tlp-pnl-rect">Rectangle</li>'
				+	'<li id="cvd-tlp-pnl-crcl">Circlh</li>'
				+	'<li id="cvd-tlp-pnl-line">Line</li>'
				+	'<li id="cvd-tlp-pnl-rbbr">Rubber</li>'
				+	'<li id="cvd-tlp-pnl-color">Color</li>'
				+	'<li id="cvd-tlp-pnl-size">Size</li>'
			+	'</ul>'
		+ '</div>'
		+ '<div id="cvd-inf"></div>',
	  bcgCtx		: undefined,
	  cvsCtx		: undefined,
	  oprCtx		: undefined,
	  cvsWidth		: 600,
	  cvsHeight		: 600
	},
    // State properties mapping
    stateMap = {
      $container	: undefined,
	  selectedCtx	: undefined,
	  selectedTool	: undefined,
	  selectedFillColor		: undefined,
	  selectedStrokeColor	: undefined,
	  selectedBrushSize			: undefined
    },
    jqMap = {}, // Cash for jQuery mapping
	setJqMap,
	
	//Utilities
	round, background, info, draw,
	//Listners
	//setListenersForOpr,
	onClickCvd,
	onClickCanvas,
	//onMouse,
	onMouseDown,
	onMouseUp,
	onMouseMove,
	onMouseOut,
	onMouseDownCrcl,
	onMouseUpCrcl,
	onMouseMoveCrcl,
	onMouseOutCrcl,
	onMouseDownToolPallet,
	onMouseUpToolPallet,
	onMouseMoveToolPallet,
	onMouseOutToolPallet,
	//onClickBrush,
	
	//Public Methods
	initModule
  ;
  // --Module Scope Variables END---------------------------------------------

  // --Utilities Method BEGIN-------------------------------------------------
  round = function (x) {
	if(x%10>0 && x%10<5) x= x - x%10;
	else if( x%10>=5 ) x= (x - x%10) + 10 ;
	return x;
  };
  
  background = function (){
	var ctx = configMap.bcgCtx;
    ctx.clearRect(0,0, configMap.cvsHeight, configMap.cvsWidth);
	ctx.lineWidth = 0.1;
    for( var i = 0; i < 601 ; i += 10 ){
	  if(i%50==0){
		ctx.strokeStyle="rgb(0,0,0)";
	  }
	  else {
		ctx.strokeStyle="rgb(144,144,144)";
	  }
	  //Vertical Lines
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, configMap.cvsHeight);
      ctx.closePath();
      ctx.stroke();
	  //Horizontal Lines
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(configMap.cvsWidth,i);
      ctx.closePath();
      ctx.stroke();
    }
	return false;
  };
  
  info = function (text) {
	jqMap.$inf.text(text);
	return false;
  }
  
  draw = function (ctx) {
	//var ctx = stateMap.selectedCtx;
	switch(stateMap.selectedTool) {
	case 'brsh' :
		//Cursor
		ctx.beginPath();
		ctx.moveTo(pre_x, pre_y);
		ctx.lineTo(end_x, end_y);
		ctx.stroke();
		ctx = configMap.cvsCtx;
		//XXX Actually drawing
		ctx.beginPath();
		ctx.moveTo(pre_x, pre_y);
		ctx.lineTo(end_x, end_y);
		ctx.stroke();
		break;
	case 'rect' :
		ctx.fillRect(begin_x, begin_y, end_x - begin_x, end_y - begin_y);
		break;
	case 'crcl' :
		var dist
		dist = Math.sqrt(Math.pow((end_x-begin_x),2)+Math.pow((end_y-begin_y),2));
		info(dist);
		ctx.beginPath();
		ctx.arc(begin_x, begin_y, dist, 0, 2*Math.PI, true);
		ctx.fill();
		break;
	case 'line' :
		ctx.beginPath();
		ctx.moveTo(begin_x, begin_y);
		ctx.lineTo(end_x, end_y);
		ctx.closePath();
		ctx.stroke();
		break;
	case 'rbbr' :
		if(ctx == configMap.oprCtx) { //XXX
			ctx.fillRect(begin_x, begin_y, end_x - begin_x, end_y - begin_y);
			ctx.rect();
		}
		if(ctx == configMap.cvsCtx)
			ctx.clearRect(begin_x, begin_y, end_x-begin_x,end_y-begin_y);
		break;
	default:
		console.log('Error! :' + stateMap.selectedTool);
	}
	return false;
  }
  // --Utilities Method END---------------------------------------------------

  // --DOM Method BEGIN-------------------------------------------------------
  /** setJqueryMap */
  setJqMap = function () {
    var $container = stateMap.$container;
    jqMap = {
		$container	: $container,
		$tlp		: $container.find('#cvd-tlp'), //ToolPallet
		$bcg		: $container.find('#cvd-bcg'), //Background
		$cvs		: $container.find('#cvd-cvs'), //Canvas
		$opr		: $container.find('#cvd-opr'), //Operation
		$inf		: $container.find('#cvd-inf')  //Information

	};
	return false;
  };
  // --DOM Method END---------------------------------------------------------

  // --Event Listeners BEGIN--------------------------------------------------
  onClickCvd = function (e){
	//var dom;
	var elementId;
	elementId = e.target.id;
	info(elementId);
	if(elementId.split('-')[1] == 'tlp') stateMap.selectedTool = elementId.split('-')[3];
	return false;
  }
  
  var //name Vecorize?
	new_x,	 new_y,
	old_x,	 old_y,
	pre_x,	 pre_y,
	begin_x, begin_y,
	end_x,   end_y,
	dragging = false; //XXX
  
    onClickCanvas = function (e) {
	if(dragging) return;
//	var x = round(e.pageX) ;
//	var y = round(e.pageY) ;
//	var ctx = stateMap.ctx;
//	ctx.fillStyle="rgb(119, 3, 7)";
//	ctx.beginPath();
//	ctx.arc(x, y, 2, 0, 2 * Math.PI);
//	ctx.fill();
  }
  
  //BEGIN Rect Listners
  onMouseDown = function (e) { // return?
	var ctx = configMap.oprCtx;
	begin_x = e.pageX ;
	begin_y = e.pageY ;
	pre_x = begin_x;
	pre_y = begin_y;
	ctx.fillStyle	=	stateMap.selectedFillColor;
	ctx.strokeStyle	=	stateMap.selectedStrokeColor;
	dragging = true;
	return false;
  };
	
  onMouseUp = function (e) {
  	var ctx = configMap.cvsCtx;
	end_x = e.pageX ;
	end_y = e.pageY ;
	if(dragging) draw(ctx);
	dragging = false;
	return false;
  };
	
  onMouseMove = function (e) {
	var ctx = configMap.oprCtx;
    ctx.clearRect(0,0, configMap.cvsHeight, configMap.cvsWidth);
	end_x = e.pageX ;
	end_y = e.pageY ;
	if(stateMap.selectedTool == 'brsh' ) ctx = configMap.cvsCtx;
	if(dragging) draw(ctx);
	pre_x = end_x;
	pre_y = end_y;
	return false;
  };
  
  onMouseOut = function () {};
  //END Rect Listeners
  
  //BEGIN Crcl Listners
  //END Crcl Listners

  //BEGIN ToolPallet Listeners
  onMouseDownToolPallet = function (e) {
	var $tlp = jqMap.$tlp;
	begin_x = e.pageX ;
	begin_y = e.pageY ;
	old_x = $tlp.offset().left;
	old_y = $tlp.offset().top;
	dragging = true;
  };
  
  onMouseUpToolPallet = function (e) {
  	var $tlp = jqMap.$tlp;
	end_x = e.pageX ;
	end_y = e.pageY ;
	new_x = old_x + (end_x - begin_x);
	new_y = old_y + (end_y - begin_y);
	if(dragging){
		$tlp.css('left', new_x);
		$tlp.css('top', new_y);
	}
	dragging = false;
  };
  
  onMouseOutToolPallet = function () {};
  
  onMouseMoveToolPallet = function (e) {
  	var $tlp = jqMap.$tlp;
	end_x = e.pageX ;
	end_y = e.pageY ;
	new_x = old_x + (end_x - begin_x);
	new_y = old_y + (end_y - begin_y);
	if(dragging){
		$tlp.css('left', new_x);
		$tlp.css('top', new_y);
	}
  };

/*下位メニュー表示モジュール*/
//  onClickBrush = function () {
//	var $panel = jqMap.$tlp.find('#cvd-tlp-pnl-brush'), html;
//	
//	html = String()
//		+ '<ul>'
//			+ '<li id="tlp-pnl-brush-rect">Rectangle</li>'
//			+ '<li id="tlp-pnl-brush-crcl">Circle</li>'
//			+ '<li id="tlp-pnl-brush-line">Line</li>'
//			+ '<li id="tlp-pnl-brush-brsh">Brush</li>'
//		+ '</ul>';
//	
//	
//	$panel.empty();
//	$panel.html(html);
//	
//	info('Brush');
//	return false;
//  }
  
//  setListenersForOpr = function (new_opr) {
//	var $opr = jqMap.$opr;
//	//前のものを一旦切る。
//	$opr.off('mousedown');
//	$opr.off('mousemove');
//	$opr.off('mouseup');
//	$opr.off('mouseout');
//	//Listenerを切り替える。
//	$opr.on('mousedown', onMouse.down[new_opr]);
//    $opr.on('mousemove', onMouse.up[new_opr]);
//    $opr.on('mouseup',   onMouse.move[new_opr]);
//    $opr.on('mouseout',  onMouse.out[new_opr]);
//	
//  }
  //END ToolPallet Listeners
//  
//  onMouse = (function() {
//	var move, up, down, out;
//	
//	move = (function () {
//		var rect, crcl, line;
//		
//		crcl = function (e) {
//			var ctx = configMap.oprCtx;
//			ctx.clearRect(0,0, configMap.cvsHeight, configMap.cvsWidth);
//			end_x = e.pageX ;
//			end_y = e.pageY ;
//			if(dragging) ctx.fillRect(begin_x, begin_y, end_x - begin_x, end_y - begin_y);
//		};
//			
//		return {
//			rect : rect,
//			crcl : crcl,
//			line : line
//		}
//	} ());
//			 
//	down = (function () {
//		var rect, crcl, line;
//					 
//		crcl =function (e) { // return?
//			var ctx = configMap.oprCtx;
//			begin_x = e.pageX ;
//			begin_y = e.pageY ;
//			ctx.fillStyle="rgb(119, 3, 7)";
//			dragging = true;
//		};
//		return {
//			rect : rect,
//			crcl : crcl,
//			line : line
//		}
//	} ());
//		 
//	up = (function () {
//		var rect, crcl, line;
//		crcl = function (e) {
//			var ctx = configMap.cvsCtx;
//			end_x = e.pageX ;
//			end_y = e.pageY ;
//			if(dragging) ctx.fillRect(begin_x, begin_y, end_x - begin_x, end_y - begin_y);
//			dragging = false;
//		};
//		return {
//			rect : rect,
//			crcl : crcl,
//			line : line
//		}
//	} ());
//	
//	return {
//		move	: move,
//		out		: out,
//		up		: up,
//		down	: down
//	}
//  } ());
  // --Event Listeners END----------------------------------------------------

  // --Public Method BEGIN----------------------------------------------------
  initModule = function( $container ) {
	var $opr, $tlp, $brush;
    $container.append( configMap.mainHtml );
    stateMap.$container = $container;
    setJqMap();
	
	if (!window.HTMLCanvasElement) {
		alert('This function needs Canvas module.');
		return false;
	}
	
	configMap.bcgCtx = jqMap.$bcg[0].getContext('2d');
	configMap.cvsCtx = jqMap.$cvs[0].getContext('2d');
	configMap.oprCtx = jqMap.$opr[0].getContext('2d');
	stateMap.selectedCtx = configMap.cvsCtx;
	
	background();
	
	//Initial Values for tool
	stateMap.selectedTool = 'crcl';
	stateMap.selectedFillColor = "rgba(63, 127, 191, 0.6)"
	stateMap.selectedStrokeColor = "rgba(191, 63, 63, 0.9)"
	stateMap.selectedBrushSize	= 10;
			
	
	//Global Listner
	$container.on('click', onClickCvd);
	
	//Set Listener concerning with Canvas DOM element
	$opr = jqMap.$opr;
	$opr.on('click', onClickCanvas);
	$opr.on('mousedown', onMouseDown);
    $opr.on('mousemove', onMouseMove);
    $opr.on('mouseup',   onMouseUp);
    $opr.on('mouseout',  onMouseOut);
	
	//Set Listner concerning with ToolPallet DOM element
	$tlp = jqMap.$tlp;
	//$tlp.on('click', onClickToolPallet);
	$tlp.on('mousedown', onMouseDownToolPallet);
    $tlp.on('mousemove', onMouseMoveToolPallet);
    $tlp.on('mouseup',   onMouseUpToolPallet);
    $tlp.on('mouseout',  onMouseOutToolPallet);

	
    return true;
  }
  // --Public Method END------------------------------------------------------

  /** Export of Public Methods */
  return {
    initModule    : initModule
  };
}());