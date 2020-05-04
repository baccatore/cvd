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

//TODO Initialize cavas size with input value

/* global $, cvd */
var cvd = (function () {
	"use strict";
	var	initModule;
	initModule = function ($container) {
		cvd.canvas.initModule($container);
		cvd.tool.initModule();
		};
	return { initModule: initModule };
})();

cvd.canvas = (function () {
	"use strict";

	/**********************/
	/** Property mapping **/
	/**********************/
	var // Configuration properties mapping
		configMap = {
			mainHtml:
				String() +
				'<div id="cvd-cvs">' +
					'<canvas id="cvd-cvs-bcg" width="1024" height="758">' +
					"</canvas>" +
					'<canvas id="cvd-cvs-cvs" width="1024" height="758">' +
					"</canvas>" +
					'<canvas id="cvd-cvs-opr" width="1024" height="758">' +
					"</canvas>" +
				"</div>",
			bcgCtx: undefined,
			cvsCtx: undefined,
			oprCtx: undefined,
			cvsWidth: 1024,
			cvsHeight: 758
		},
		// State properties mapping
		stateMap = {
			$container: undefined,
			selectedCtx: undefined,
		},
		// Cash for jQuery mapping
		jqMap = {},
		// Private methods
		setJqMap,
		initializeBackground,
		setRuler,
		// Public methods
		getCvsCtx,
		getOprCtx,
		flush,
		initModule;

	/*********************/
	/** Private methods **/
	/*********************/
	setJqMap = function () {
		var $container = stateMap.$container;
		jqMap = {
			$container: $container,
			$bcg: $container.find("#cvd-cvs-bcg"), //Background
			$cvs: $container.find("#cvd-cvs-cvs"), //Canvas
			$opr: $container.find("#cvd-cvs-opr") //Operation
		};
		return false;
	};

	initializeBackground = function () {
		var ctx = configMap.bcgCtx;
		ctx.clearRect(0, 0, configMap.cvsWidth, configMap.cvsHeight);
		setRuler();
		return false;
	};

	setRuler = function () {
		var ctx = configMap.bcgCtx;
		ctx.lineWidth = 0.1;

		//Vertical Lines
		for (var i = 0; i < configMap.cvsWidth; i += 10) {
			if (i % 50 == 0) {
				ctx.strokeStyle = "rgb(0,0,0)";
			} else {
				ctx.strokeStyle = "rgb(144,144,144)";
			}
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i, configMap.cvsHeight);
			ctx.closePath();
			ctx.stroke();
		}

		//Horizontal Lines
		for (var i = 0; i < configMap.cvsHeight; i += 10) {
			if (i % 50 == 0) {
				ctx.strokeStyle = "rgb(0,0,0)";
			} else {
				ctx.strokeStyle = "rgb(144,144,144)";
			}
			ctx.beginPath();
			ctx.moveTo(0, i);
			ctx.lineTo(configMap.cvsWidth, i);
			ctx.closePath();
			ctx.stroke();
		}
		return false;
	};


	/********************/
	/** Public Methods **/
	/********************/
	flush = function(){
		configMap.oprCtx.clearRect(0, 0, configMap.cvsWidth, configMap.cvsHeight);
		return false;
	};

	getCvsCtx = function(){
		return jqMap.$cvs[0].getContext("2d")
	};

	getOprCtx = function(){
		return jqMap.$opr[0].getContext("2d")
	};

	initModule = function ($container) {
		var $opr, $tlp, $brush;
		$container.append(configMap.mainHtml);
		stateMap.$container = $container;
		setJqMap();

		// Check cavanvas module is available
		if (!window.HTMLCanvasElement) {
			alert("This function needs Canvas module.");
			return false;
		}

		// Initialize canvas context
			configMap.bcgCtx = jqMap.$bcg[0].getContext("2d");
			configMap.cvsCtx = getCvsCtx();
			configMap.oprCtx = getOprCtx();
			stateMap.selectedCtx = configMap.cvsCtx;

		// Initialize background
		initializeBackground();

		// Set listeners
		$opr = jqMap.$opr;
		var eventData = {'cvsCtx': configMap.cvsCtx, 'oprCtx': configMap.oprCtx};
		$opr.on("mousedown",eventData,cvd.tool.down);
		$opr.on("mousemove",eventData,cvd.tool.move);
		$opr.on("mouseup",eventData,cvd.tool.up);

		return true;
	};

	/***************************/
	/** Export Public Methods **/
	/***************************/
	return {
		initModule: initModule,
		flush: flush,
		getCvsCtx: getCvsCtx,
		getOprCtx: getOprCtx
	};
})();

/*****************/
/** Tool module **/
/*****************/
cvd.tool = (function () {
	"use strict";
	var
	  configMap = {
			colorPalettes : 
			[ '#140c1c', '#442434', '#30346d', '#4e4a4e',
				'#854c30', '#346524', '#d04648', '#757161',
				'#597dce', '#d27d2c', '#8595a1', '#6daa2c', 
				'#d2aa99', '#6dc2ca', '#dad45e', '#deeed6'],
			selectedAreaColor : '#000000'
		},
	  mouse = {
			start    : {x: undefined, y:undefined },
			previous : {x: undefined, y:undefined },
			end      : {x: undefined, y:undefined },
			isDragged: false,
			down: undefined,
			move: undefined,
			up: undefined
			//TODO define mouseout event
			//out: undefined
		},
		stateMap = {
			selectedCtx: undefined,
			selectedTool: undefined,
			selectedColor: undefined,
			selectedBrushSize: undefined
		},
	  draw,
		changeColor,
		changeTool,
		initModule;

		mouse.down= function(e){
			mouse.start = {x: e.pageX, y: e.pageY};
			mouse.previous = mouse.start;
			mouse.isDragged= true;
		};

		mouse.move = function(e) {
			var tool = stateMap.selectedTool;
			if (mouse.isDragged) {
				mouse.end = {x: e.pageX, y: e.pageY};
				if (!(tool == "brsh" && tool == "rbbr")) cvd.canvas.flush();
				draw();
				mouse.previous = mouse.end;
			};
			return false;
		};

		mouse.up = function(e) {
			var tool = stateMap.selectedTool;
			mouse.end = {x: e.pageX, y: e.pageY};
			mouse.isDragged = false;
			if (!(tool == "brsh" && tool == "rbbr")) cvd.canvas.flush();
			draw();
			return false;
		};
		
		changeColor = function(colorIndex){
			stateMap.selectedColorIndex = colorIndex;
			configMap.cvsCtx.fillStyle = configMap.colorPalettes[colorIndex];
			configMap.cvsCtx.strokeStyle = configMap.colorPalettes[colorIndex];
			return false;
		};

		changeTool = function(toolName){
			stateMap.selectedTool = toolName;
			if(toolName == 'rbbr'){
				changeColor(0);
			} else {
				changeColor(stateMap.selectedColorIndex);
			};
			return false;
		};
		
		draw = function () {
			var ctx = undefined;
			switch (stateMap.selectedTool) {
				case "brsh":
				    ctx = configMap.cvsCtx;
						ctx.beginPath();
						ctx.moveTo(mouse.previous.x, mouse.previous.y);
						ctx.lineTo(mouse.end.x, mouse.end.y);
						ctx.stroke();
					break;
				case "rect":
				  ctx = mouse.isDragged ? configMap.oprCtx : configMap.cvsCtx;
					ctx.fillRect(mouse.start.x, mouse.start.y,
						mouse.end.x - mouse.start.x, mouse.end.y - mouse.start.y);
					break;
				case "crcl":
				  ctx = mouse.isDragged ? configMap.oprCtx : configMap.cvsCtx;
					var dist;
					dist = Math.sqrt(
						Math.pow(mouse.end.x - mouse.start.x, 2)
							+ Math.pow(mouse.end.y - mouse.start.y, 2)
					);
					ctx.beginPath();
					ctx.arc(mouse.start.x, mouse.start.y, dist, 0, 2 * Math.PI, true);
					ctx.fill();
					break;
				case "line":
				  ctx = mouse.isDragged ? configMap.oprCtx : configMap.cvsCtx;
					ctx.beginPath();
					ctx.moveTo(mouse.start.x, mouse.start.y);
					ctx.lineTo(mouse.end.x, mouse.end.y);
					ctx.closePath();
					ctx.stroke();
					break;
				case "rbbr":
					ctx.beginPath();
					ctx.moveTo(mouse.previous.x, mouse.previous.y);
					ctx.lineTo(mouse.end.x, mouse.end.y);
					ctx.stroke();
					break;
				default:
					console.log("Error! :" + stateMap.selectedTool);
			}
			return false;
		};

		initModule = function (){
			// Initialize tool parameters
			stateMap.selectedTool = "brsh";
			configMap.selectedAreaColor = "rgba(63, 127, 191, 0.6)";
			configMap.cvsCtx = cvd.canvas.getCvsCtx();
			configMap.oprCtx = cvd.canvas.getOprCtx();
			configMap.oprCtx.fillStyle = configMap.selectedAreaColor;
			configMap.oprCtx.strokeStyle = configMap.selectedAreaColor;

			stateMap.selectedBrushSize = 10;
			configMap.cvsCtx.lineWidth =stateMap.selectedBrushSize;
			configMap.cvsCtx.lineCap = "round";
		return false;
	};

	return {
		down: mouse.down,
		move: mouse.move,
		up: mouse.up,
		initModule: initModule,
		changeTool: changeTool,
		changeColor: changeColor
		};
}());

