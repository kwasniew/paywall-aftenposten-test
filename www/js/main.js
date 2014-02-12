define('main', ['alf', 'callback-helper'], function (Alf, CallbackHelper)
{
    'use strict';
    var $ = Alf.dom;

    var app = {
        initialize: function()
        {
            this.context = this.objectifyUrlParams();

            this.isEmbeddedInApp = true;
            if('isEmbeddedInApp' in this.context)
                this.isEmbeddedInApp = this.context.isEmbeddedInApp;

            this.event = null;
            this.bridge = null;
            this.initBridge();

            this.callbackHelper = new CallbackHelper({ namespace: 'app.callbackHelper' });
        },

        objectifyUrlParams: function()
        {
            var params = {};
            var search = window.location.search;

            // https://github.com/sindresorhus/query-string
            if(typeof search === 'string')
            {
                search = search.trim().replace(/^\?/, '');

                if(search)
                {
                    params = search.trim().split('&').reduce(function(result, param)
                    {
                        var parts = param.replace(/\+/g, ' ').split('=');
                        // missing `=` should be `null`:
                        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                        result[parts[0]] = parts[1] === undefined ? null : decodeURIComponent(parts[1]);
                        return result;
                    }, {});
                }
            }

            return params;
        },

        logToApp: function(data)
        {
            this.bridge.trigger('log',
            {
                'message': data,
                'level': 1
            });
        },

        logToConsole: function(data)
        {
            if(typeof console === 'object')
                console.log(data);
        },

        logToAll: function(data)
        {
            this.logToConsole(data);
            this.logToApp(data);
        },

        /**
         * Initialize the bridge used for communication between native and HTML
         *
         * @return {void}
         */
        initBridge: function()
        {
            // This is used to trigger HTML-events by the native layer
            this.event = _.extend({}, Alf.Events); // Clone

            /*this.event = {
                on: Zepto.fn.on,
                off: Zepto.fn.off,
                bind: Zepto.fn.on,
                unbind: Zepto.fn.off,
                one: Zepto.fn.one,
                trigger: Zepto.fn.trigger,
                triggerHandler: Zepto.fn.triggerHandler
            };*/

            // This is used to send event-data to the native app
            this.bridge = _.extend({}, Alf.Events,
            {
                initialize: function()
                {
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
                eventTriggered: function()
                {
                    //console.log([].slice.call(arguments));
                    var eventInfo = JSON.stringify([].slice.call(arguments));

                    this.frameIndex = (this.frameIndex + 1) % this.eventFrames.length;

                    if(app.isEmbeddedInApp)
                        this.eventFrames[this.frameIndex].src = 'event://' + escape(eventInfo);
                    else
                        app.logToConsole('Event: ' + eventInfo);
                }
            });

            this.bridge.initialize();
        }
    };

    app.initialize();
    window.app = app;
    window.onerror = function(message, url, linenumber)
    {
        var error = url + ':' + linenumber + ' - ' + message;
        app.logToConsole(error);
        app.bridge.trigger('error', {
            "reason": error
        });
    };

    Alf.hub.on('fullscreenWillAppear', function()
    {
        app.bridge.trigger('displayState', { 'event': 'fullscreenWillAppear' });
    }, this);

    Alf.hub.on('fullscreenWillDisappear', function()
    {
        app.bridge.trigger('displayState', { 'event': 'fullscreenWillDisappear' });
    }, this);

    Alf.hub.on('fullscreenDidAppear', function()
    {
        app.bridge.trigger('displayState', { 'event': 'fullscreenDidAppear' });
    });

    Alf.hub.on('fullscreenDidDisappear', function()
    {
        app.bridge.trigger('displayState', { 'event': 'fullscreenDidDisappear' });
    });

    app.event.on('clientInfo', function(info)
    {
        app.logToAll('Got clientInfo:');
    });

    app.event.on('networkReachability', function(state)
    {
        app.logToAll('Got networkReachability:');
    });

    app.event.on('applicationState', function(state)
    {
        app.logToAll('Got applicationState: ' + state);
    });

    return app;
});
