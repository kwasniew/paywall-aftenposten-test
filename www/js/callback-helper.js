define('callback-helper', function()
{
    'use strict';

    var CallbackHelper = function(args)
    {
        this.init(args);
    };

    CallbackHelper.prototype.init = function(args)
    {
        this.args = args;
        this.namespace = args.namespace;
        this.uniqueCallbackIndex = 0;
        this.register = {};
    };

    CallbackHelper.prototype._currentUnixTimestampInSeconds = function()
    {
        return parseInt(+new Date() / 1000, 10);
    };

    CallbackHelper.prototype._createUniqueCallbackIdentifier = function()
    {
        return 'callback_' + ++this.uniqueCallbackIndex;
    };

    CallbackHelper.prototype._addEntry = function(identifier, callback, timeout)
    {
        var now = this._currentUnixTimestampInSeconds();

        this.register[identifier] = {
            expireDate: now + timeout,
            callback: callback,
            identifier: identifier
        };
    };

    CallbackHelper.prototype._removeEntry = function(entry)
    {
        delete this.register[entry.identifier];
    };

    CallbackHelper.prototype._removeEntries = function(entriesToRemove)
    {
        for(var index in entriesToRemove)
        {
            this._removeEntry(entriesToRemove[index]);
        }
    };

    CallbackHelper.prototype._cleanupExpiredCallbacks = function()
    {
        var now = this._currentUnixTimestampInSeconds();

        var entriesToRemove = [];
        for(var identifier in this.register)
        {
            if(this.register.hasOwnProperty(identifier))
            {
                var entry = this.register[identifier];
                if(now >= entry.expireDate)
                    entriesToRemove.push(entry);
            }
        }

        this._removeEntries(entriesToRemove);
    };

    /**
     * Create an anonymous function
     *
     * @return {string} Identifier of callback
     */
    CallbackHelper.prototype.create = function(callback, timeout)
    {
        var defaultTimeout = 60;
        var timeout = timeout > 0 ? timeout : defaultTimeout;
        var identifier = this._createUniqueCallbackIdentifier();
        this._addEntry(identifier, callback, timeout);

        var self = this;
        window.setTimeout(function()
        {
            self._cleanupExpiredCallbacks.call(self);
        }, timeout);

        return {
            'function': this.namespace + '.trigger',
            'event': identifier,
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
        if(entry)
        {
            entry.callback.apply(this, [].slice.call(arguments, 1));
            this._removeEntry(entry);
        }
        this._cleanupExpiredCallbacks();
    };

    return CallbackHelper;
});
