define('callback-helper', function()
{
    'use strict';

    var CallbackHelper = function(args)
    {
        this._initialize(args);
    };

    CallbackHelper.prototype._initialize = function(args)
    {
        this.args = args;
        this.namespace = args.namespace;
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
            "function": this.namespace + ".trigger",
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

    return CallbackHelper;
});
