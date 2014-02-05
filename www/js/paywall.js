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

        init: function()
        {
            window.nativeContext = this.getNativeContext();
            this.updateHeight();
            this.adjustLoginInputsIfMobile();
            this.registerCommonEventListeners();
            this.registerPurchaseEventListeners();
            this.registerUserEventListeners();
        },

        updateHeight: function()
        {
            // Find the highest tab
            var arr = [];
            $('.paywall-tab').each(function()
            {
                var $tab = $(this);
                var thisOutherHeight = $tab.outerHeight();
                var thisMarginTop = thisOutherHeight / 2;
                arr.push(thisOutherHeight);
                $tab.css('margin-top',  -thisMarginTop);
            });

            var totalHeight = Math.max.apply(Math, arr);
            $('#paywall-content').css('height', totalHeight);

            // Notify native about the paywall’s height
            app.bridge.trigger('paywallLoaded', { 'height': totalHeight });
        },

        adjustLoginInputsIfMobile: function()
        {
            if(this.deviceHeight <= 480)
            {
                var $login = $('#paywall-login');

                $('input')
                    .focus(function()
                    {
                        $login.addClass('focus');
                    })
                    .blur(function()
                    {
                        $login.removeClass('focus');
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
                if(!search) return {};

                return search.trim().split('&').reduce(function(result, param)
                {
                    var parts = param.replace(/\+/g, ' ').split('=');
                    // missing `=` should be `null`:
                    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
                    result[parts[0]] = parts[1] === undefined ? null : decodeURIComponent(parts[1]);
                    return result;
                }, {});
            }

            return nativeContext;
        },

        addSpinner: function($target)
        {
            $target.append('<div class="spinner"></div>');
        },

        /*
         *      Purchase related
         */

        purchaseInfoDone: function(data, provider)
        {
            if('products' in data && data.products.length)
            {
                var $target = $('#paywall-products .purchase-options');

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
            app.bridge.trigger('getUserInfo',
            {
                provider: provider,

                doneEvent: app.callbackHelper.create(),
                failEvent: app.callbackHelper.create()
            });

            // Display purchase success message
            // remove spinner
        },

        purchaseFail: function(data)
        {
            // remove spinner
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

            // Choose a provider to buy from, ask its purchase alternatives
            $('#paywall-buy').on('click', '.in-app-purchase', function(e)
            {
                var provider = $(this).data('provider');

                app.bridge.trigger('getPurchaseInfo',
                {
                    provider: provider,

                    doneEvent: app.callbackHelper.create(function(data)
                    {
                        self.purchaseInfoDone(data, provider);
                    }),

                    failEvent: app.callbackHelper.create(self.purchaseInfoFail)
                });

                e.preventDefault();
            });

            // Choose one of the provider’s purchase alternatives
            $('#paywall-products').on('click', '.purchase-options .purchase-button', function()
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
            $('#paywall-products').on('click', '.restore-purchases', function(e)
            {
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
        },

        /*
         *      User related
         */

        loginDone: function(provider)
        {
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
            $('#paywall-login').on('submit', 'form', function(e)
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
            $('#paywall-logged-in').on('click', '.paywall-logout', function(doneEvent)
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

        registerCommonEventListeners: function()
        {
            var $root = $('#chrome');

            $root.on('click', '.external-browser', function(e)
            {
                var url = $(this).attr('href');
                app.bridge.trigger('externalBrowser', { url: url });

                e.preventDefault();
            });

            $root.on('click', '.paywall-tab-trigger', function(e)
            {
                $('.paywall-tab.open').removeClass('open');
                $('.paywall-tab-trigger.open').removeClass('open');
                $($(this).attr('internal')).addClass('open');
                $(this).addClass('open');

                e.preventDefault();
            });

            $root.on('click', '.active-tab', function(e)
            {
                $($(this).attr('active-tab')).addClass('open');

                e.preventDefault();
            });

            $root.on('touchmove touchstart', function()
            {
                $('.layer-content').removeClass('overflowHidden');
            });
        }
    };

    return Paywall;
});
