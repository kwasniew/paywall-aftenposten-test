define('paywall', ['main'], function(app)
{
    'use strict';

    /*
     *      P A Y W A L L
     */

    var Paywall = function(args)
    {
        this.init(args);
    };

    Paywall.prototype = {
        user: null,

        init: function()
        {
            this.updateHeight();
            this.getUserInfo();

            // Event listeners
            this.registerUserEventListeners();
            this.registerPurchaseEventListeners();
        },

        updateHeight: function()
        {
            // Notify native about the paywall’s height, in pixels
            app.bridge.trigger('paywallLoaded', { height: 300 });
        },

        getUserInfoDone: function(data)
        {
            this.user = data.userInfo;
        },

        getUserInfoFail: function(error)
        {
            this.user = null;
        },

        getUserInfo: function(provider)
        {
            var self = this;
            if(!provider) provider = 'spid';

            app.bridge.trigger('getUserInfo',
            {
                provider: provider,
                doneEvent: app.callbackHelper.create(_.bind(self.getUserInfoDone, self)),
                failEvent: app.callbackHelper.create(_.bind(self.getUserInfoFail, self))
            });
        },

        /*
         *      User related event listeners
         */

        loginDone: function(provider)
        {
            this.getUserInfo(provider);
        },

        loginFail: function(error)
        {

        },

        logoutDone: function(provider)
        {

        },

        logoutFail: function(error)
        {

        },

        registerUserEventListeners: function()
        {
            var self = this;

            // Log in
            $(document).on('submit', 'form.login', function(e)
            {
                app.bridge.trigger('login',
                {
                    provider: $(this).data('provider'),
                    username: username,
                    password: password,
                    doneEvent: app.callbackHelper.create(_.bind(self.loginDone, self, provider))
                    failEvent: app.callbackHelper.create(_.bind(self.loginFail, self))
                });

                e.preventDefault();
            });

            // Log out
            $(document).on('click', '.logout', function(e)
            {
                app.bridge.trigger('logout',
                {
                    provider: $(this).data('provider'),
                    doneEvent: app.callbackHelper.create(_.bind(self.logoutDone, self, provider))
                    failEvent: app.callbackHelper.create(_.bind(self.logoutFail, self))
                });

                e.preventDefault();
            });
        },

        /*
         *      Purchase related event listeners
         */

        getPurchaseInfoDone: function(data, provider)
        {
            // Lay out buttons
        },

        getPurchaseInfoFail: function(error)
        {

        },

        purchaseDone: function(provider)
        {

        },

        purchaseFail: function(error)
        {

        },

        restorePurchasesDone: function(provider)
        {

        },

        restorePurchasesFail: function(error)
        {

        },

        registerPurchaseEventListeners: function()
        {
            var self = this;

            // Choose a provider to buy from, ask for its purchase options
            $(document).on('click', '.in-app-purchase', function(e)
            {
                var provider = $(this).data('provider');

                app.bridge.trigger('getPurchaseInfo',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(function(data)
                    {
                        self.getPurchaseInfoDone.call(self, data, provider);
                    }),
                    failEvent: app.callbackHelper.create(_.bind(self.getPurchaseInfoFail, self))
                });

                e.preventDefault();
            });

            // Choose one of the provider’s purchase alternatives
            $(document).on('click', '.purchase-options button', function()
            {
                var $button = $(this);
                var provider = $button.data('provider');
                var productIdentifier = $button.data('product-identifier');

                app.bridge.trigger('purchase',
                {
                    provider: provider,
                    productIdentifier: productIdentifier,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        self.purchaseDone.call(self, provider);
                    }),
                    failEvent: app.callbackHelper.create(_.bind(self.purchaseFail, self)))
                });
            });

            // Restore purchases
            $(document).on('click', '.restore-purchases', function(e)
            {
                var provider = $(this).data('provider');

                app.bridge.trigger('restorePurchases',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        self.restorePurchasesDone.call(self, provider);
                    }),
                    failEvent: app.callbackHelper.create(_.bind(self.restorePurchasesFail, self))
                });

                e.preventDefault();
            });
        }
    };

    return Paywall;
});
