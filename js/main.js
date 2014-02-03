define('main', ['alf'], function (Alf) {
	"use strict";
	var $ = Alf.dom;

	var app = {
		initialize: function () {
			this.isEmbeddedInApp = this.getURLParameter('isEmbeddedInApp', '1') != '0';			
			this.event = null;
			this.bridge = null;
			this.initBridge();

			this.callbackHelper = this.initCallbackHelper({
				nameSpace: 'app.callbackHelper'
			});
		},

		getURLParameter: function(name, fallbackValue) {
    		return decodeURI(
        		(RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,fallbackValue])[1]
    			);
		},

		logToApp: function(data) {
			this.bridge.trigger('log', {
				"message": data,
				"level": 1
			});
		},

		logToConsole: function(data) {
			if (typeof console == "object") {
				console.log(data);
			}
		},

		logToAll: function(data) {
			this.logToConsole(data);
			this.logToApp(data);
		},

		/**
		 * Initialize the bridge used for communication between native and HTML
		 *
		 * @return {void}
		 */
		initBridge: function () {
			// This is used to trigger HTML-events by the native layer
			this.event = _.extend({}, Alf.Events);

			// This is used to send event-data to the native app
			this.bridge = _.extend({}, Alf.Events, {
			  initialize: function () {
					this.frameIndex = 0;
					this.eventFrames = $('.event-frame');
					this.bind('all', this.eventTriggered);
				},

				/**
				 * Event triggered
				 *
				 * This works like a proxy for all events triggered on this.bridge
				 * Change the src attribute on any of the iframes so the native wrapper app
				 * can intercept it and decode the JSON payload in the URL
				 *
				 * @return {void}
				 */
				eventTriggered: function () {
                    console.log([].slice.call(arguments));
					var eventInfo = JSON.stringify([].slice.call(arguments));

                    this.frameIndex = (this.frameIndex + 1) % this.eventFrames.length;
					if(app.isEmbeddedInApp)
					{
                    	this.eventFrames[this.frameIndex].src = 'event://' + escape(eventInfo);
					}
					else
					{
						app.logToConsole('Event: ' + eventInfo);
					}
				}
			});

			this.bridge.initialize();
		},

		initCallbackHelper: function(args)
		{
			var CallbackHelper = function(args)
			{
				this._initialize(args);
			};

			CallbackHelper.prototype._initialize = function(args)
			{
				this.args = args;
				this.nameSpace = args.nameSpace;
				this.uniqueCallbackIndex = 0;
				this.register = {};
			};

			CallbackHelper.prototype._currentUnixTimeStampInSeconds = function()
			{
				return Math.round(+new Date()/1000); 
			};

			CallbackHelper.prototype._createUniqueCallbackIdentifier = function()
			{
				this.uniqueCallbackIndex++;
				return 'tmp'+'_'+this.uniqueCallbackIndex;
			};

			CallbackHelper.prototype._addEntry = function(identifier, callback, timeOut)
			{
				var now = this._currentUnixTimeStampInSeconds();
				var entry = {
					expireDate: now + timeOut,
					callback: callback,
					identifier: identifier
				};
				this.register[identifier] = entry;
			};

			CallbackHelper.prototype._removeEntry = function(entry)
			{
				var identifier = entry.identifier;
				delete this.register[identifier];
			};

			CallbackHelper.prototype._removeEntries = function(entriesToRemove)
			{
				for(var index in entriesToRemove) {
					var entry = entriesToRemove[index];
					this._removeEntry(entry);
				}
			};

			CallbackHelper.prototype._cleanUpExpiredCallbacks = function()
			{
				var now = this._currentUnixTimeStampInSeconds();
				var entriesToRemove = [];
				for(var identifier in this.register) {
					if (this.register.hasOwnProperty(identifier)) {
						var entry = this.register[identifier];
						if(now >= entry.expireDate) {
						 	entriesToRemove.push(entry);
						}
					}
				}
				this._removeEntries(entriesToRemove);
			};

			/**
			 * Create an anonymous function 
			 *
			 * @return {string} Identifier of callback
			 */
			CallbackHelper.prototype.create = function(callback, timeOut)
			{
				var defaultTimeOut = 60; 
				var timeOut = timeOut > 0 ? timeOut : defaultTimeOut;
				var identifier = this._createUniqueCallbackIdentifier();
				this._addEntry(identifier, callback, timeOut);
				var that = this;
				setTimeout(function() { that._cleanUpExpiredCallbacks }, timeOut);

				return { 
					"function": this.nameSpace + ".trigger",
					"event": identifier,
				};
			};

			/**
			 * Trigger a callback function by identifier 
			 *
			 * @return {void}
			 */
			CallbackHelper.prototype.trigger = function(identifier, args) 
			{
				var entry = this.register[identifier];
				if(entry) {
					entry.callback.apply(this, [].slice.call(arguments,1));
					this._removeEntry(entry);
				}
				this._cleanUpExpiredCallbacks();
			};

			return new CallbackHelper(args);
		},

	};

	app.initialize();
	window.app = app;
	window.onerror = function(message, url, linenumber) {
		var error = url + ':' + linenumber + ' - ' + message;
		app.logToConsole(error);
		app.bridge.trigger('error', { 
			"reason": error
		});
	};

	app.bridge.trigger('getPurchaseInfo', {
		provider: "spid", 
		doneEvent: app.callbackHelper.create(function(args) {
			console.log("getPurchaseInfo Callback - success");
			console.log(args);
		}), 
		failEvent: app.callbackHelper.create(function(args) {
			console.log("getPurchaseInfo Callback - fail");
			console.log(args);
		})
	});

	app.bridge.trigger('getUserInfo', {
		provider: "spid", 
		doneEvent: app.callbackHelper.create(function(args) {
			console.log("getUserInfo Callback - success");
			console.log(args);
		}), 
		failEvent: app.callbackHelper.create(function(args) {
			console.log("getUserInfo Callback - fail");
			console.log(args);
		})
	});


	Alf.hub.on('fullscreenWillAppear', function () {
		app.bridge.trigger('displayState', {"event":'fullscreenWillAppear'});
	}, this);

	Alf.hub.on('fullscreenWillDisappear', function () {
		app.bridge.trigger('displayState', {"event":'fullscreenWillDisappear'});
	}, this);

	Alf.hub.on('fullscreenDidAppear', function() {
		app.bridge.trigger('displayState', {"event":'fullscreenDidAppear'});
	});

	Alf.hub.on('fullscreenDidDisappear', function() {
		app.bridge.trigger('displayState', {"event":'fullscreenDidDisappear'});
	});

	app.event.on('clientInfo', function (info) {
		app.logToAll('Got clientInfo:');
	});

	app.event.on('networkReachability', function (state) {
		app.logToAll('Got networkReachability:');
	});

	app.event.on('applicationState', function(state) {
		app.logToAll('Got applicationState: ' + state);
	});

	$(document).ready(function () {
		app.bridge.trigger('integrationLoaded', {});
	});

	return app;

});