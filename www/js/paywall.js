define('paywall', ['main'], function(app)
{
    'use strict';

    var isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.iOS() );
        }
    };

    if(isMobile.Android())
        $('body').addClass('android');


    /*
     *      P A Y W A L L
     */

    var Paywall = function(args)
    {
        this.init(args);
    };

    Paywall.prototype = {
        deviceHeight: window.screen.height,

        $chrome: $('#chrome'),

        tab: {
            $all: $('.tab'),
            $login: $('#login'),
            $forgotPassword: $('#forgot-password'),
            $loggedIn: $('#logged-in'),
            $purchase: $('#purchase'),
            $products: $('#products')
        },

        init: function()
        {
            this.nativeContext = this.getNativeContext();
            this.updateHeight();
            this.adjustLoginInputsIfMobile();
            this.registerCommonEventListeners();
            this.registerUserEventListeners();
            this.registerPurchaseEventListeners();
        },

        updateHeight: function()
        {
            // Find the highest tab
            var tabHeights = [];
            this.tab.$all.each(function()
            {
                var $tab = $(this);

                var tabOutherHeight = $tab.outerHeight();
                tabHeights.push(tabOutherHeight);

                var tabMarginTop = (tabOutherHeight / 2) * -1;
                $tab.css('margin-top', tabMarginTop);
            });

            var tallestTabHeight = Math.max.apply(Math, tabHeights);
            $('#content').css('height', tallestTabHeight);

            // Notify native about the paywall’s height
            app.bridge.trigger('paywallLoaded', { 'height': tallestTabHeight });
        },

        adjustLoginInputsIfMobile: function()
        {
            var self = this;

            if(this.deviceHeight <= 480)
            {
                $('input')
                    .focus(function()
                    {
                        self.tab.$login.addClass('focus');
                    })
                    .blur(function()
                    {
                        self.tab.$login.removeClass('focus');
                    });
            }
        },

        getNativeContext: function()
        {
            var nativeContext = {};
            var search = window.location.search;

            // https://github.com/sindresorhus/query-string
            if(typeof search === 'string')
            {
                search = search.trim().replace(/^\?/, '');

                if(search)
                {
                    nativeContext = search.trim().split('&').reduce(function(result, param)
                    {
                        var parts = param.replace(/\+/g, ' ').split('=');
                        // missing `=` should be `null`:
                        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                        result[parts[0]] = parts[1] === undefined ? null : decodeURIComponent(parts[1]);
                        return result;
                    }, {});
                }
            }

            return nativeContext;
        },

        addSpinner: function($target)
        {
            $target.html('<div class="spinner"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>');
        },

        /*
         *      Common event listeners
         */

        registerCommonEventListeners: function()
        {
            this.$chrome.on('click', '.external-browser', function(e)
            {
                var url = $(this).attr('href');
                app.bridge.trigger('externalBrowser', { url: url });

                e.preventDefault();
            });

            this.$chrome.on('click', '.tab-trigger', function(e)
            {
                $('.tab.open').removeClass('open');
                $('.tab-trigger.open').removeClass('open');
                $($(this).attr('internal')).addClass('open');
                $(this).addClass('open');

                e.preventDefault();
            });
        },

        /*
         *      User related event listeners
         */

        loginDone: function(provider)
        {
            console.log('login with ' + provider + 'successful');
            // Re-fetch user info?
        },

        loginFail: function(data)
        {
            console.log('loginFail', data);
        },

        logoutDone: function()
        {
            // Re-fetch user info?
        },

        logoutFail: function(data)
        {
            console.log('logoutFail', data);
        },

        registerUserEventListeners: function()
        {
            var self = this;

            // Register
            // TBD

            // Log in
            this.tab.$login.on('submit', 'form', function(e)
            {
                var $form = $(this);
                var provider = $form.data('provider');
                var username = $.trim($form.find('input[name="username"]').val());
                var password = $(this).find('input[name="password"]').val();

                app.bridge.trigger('login',
                {
                    provider: provider,
                    username: username,
                    password: password,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        self.loginDone(provider);
                    }),
                    failEvent: app.callbackHelper.create(self.loginFail)
                });

                e.preventDefault();
            });

            // Forgot password


            // Log out (not sure if this should be constrained to this tab only)
            this.tab.$loggedIn.on('click', '.logout', function(doneEvent)
            {
                var provider = $(this).data('provider');
                app.bridge.trigger('logout',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(self.logoutDone),
                    failEvent: app.callbackHelper.create(self.logoutFail)
                });

                e.preventDefault();
            });
        },

        /*
         *      Purchase related event listeners
         */

        purchaseInfoDone: function(data, provider, $target)
        {
            if('products' in data && data.products.length)
            {
                var $buttons = $('<div class="purchase-options"></div>');
                $.each(data.products, function(i, product)
                {
                    var $productbutton = $(
                        '<button type="button" data-product-identifier="' + product.productIdentifier + '" data-provider="' + provider + '" class="button blue-button">' +
                            'Kjøp <span class="title">' + product.title + '</span> ' +
                            'for <span class="price">' + product.priceFormatted + '</span>' +
                        '</button>'
                    );

                    $buttons.append($productbutton);
                });

                $target.html($buttons.html());
            }
        },

        purchaseInfoFail: function(data)
        {
            console.log('purchaseInfoFail', data);
        },

        purchaseDone: function(provider)
        {
            // Native removes paywall...

            // Refresh user?
            // Display purchase success message?
        },

        purchaseFail: function(data)
        {
            console.log('purchaseFail', data);
        },

        restorePurchasesDone: function(provider)
        {

        },

        restorePurchasesFail: function(data)
        {
            console.log('restorePurchasesFail', data);
        },

        registerPurchaseEventListeners: function()
        {
            var self = this;

            // Choose a provider to buy from, ask for its purchase options
            this.tab.$purchase.on('click', '.in-app-purchase', function(e)
            {
                var $placeholder = self.tab.$products.find('.purchase-options');
                self.addSpinner($placeholder);

                var provider = $(this).data('provider');

                app.bridge.trigger('getPurchaseInfo',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(function(data)
                    {
                        self.purchaseInfoDone(data, provider, $placeholder);
                    }),
                    failEvent: app.callbackHelper.create(self.purchaseInfoFail)
                });

                e.preventDefault();
            });

            // Choose one of the provider’s purchase alternatives
            this.tab.$products.on('click', '.purchase-options button', function()
            {
                var $button = $(this);
                var provider = $button.data('provider');
                var productIdentifier = $button.data('product-identifier');

                // add spinner

                app.bridge.trigger('purchase',
                {
                    provider: provider,
                    productIdentifier: productIdentifier,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        self.purchaseDone(provider);
                    }),
                    failEvent: app.callbackHelper.create(self.purchaseFail)
                });
            });

            // Restore purchases
            this.$chrome.on('click', '.restore-purchases', function(e)
            {
                console.log('restore!');
                var provider = $(this).data('provider');

                app.bridge.trigger('restorePurchases',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        self.restorePurchasesDone(provider);
                    }),
                    failEvent: app.callbackHelper.create(self.restorePurchasesFail)
                });

                e.preventDefault();
            });
        }
    };

    return Paywall;
});
