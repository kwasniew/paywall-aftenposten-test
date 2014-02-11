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
        user: null,
        deviceHeight: window.screen.height,

        $chrome: $('#chrome'),

        tab: {
            $all: $('.tab'),
            $triggers: $('.tab-trigger'),
            $login: $('#login'),
            $forgotPassword: $('#forgot-password'),
            $loggedIn: $('#logged-in'),
            $purchase: $('#purchase'),
            $products: $('#products')
        },

        init: function()
        {
            this.updateHeight();
            this.adjustLoginInputsIfMobile();

            // Store as member variables on app for convenience
            this.nativeContext = this.getNativeContext();
            this.getUserInfo();

            // Event listeners
            this.registerCommonEventListeners();
            this.registerUserEventListeners();
            this.registerPurchaseEventListeners();
        },

        switchTab: function(identifier)
        {
            // Hide current tab
            this.tab.$all.removeClass('open');
            this.tab.$triggers.removeClass('open');

            // Show new tab
            $(identifier).addClass('open');
            this.tab.$triggers.filter('[internal="' + identifier + '"]').addClass('open');
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
                $chrome.on('input', 'focus', function()
                {
                    self.tab.$login.addClass('focus');
                });

                $chrome.on('input', 'blur', function()
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

        userInfoDone: function(data)
        {
            this.user = data.userInfo;

            this.tab.$loggedIn.find('.spid-user-name')
                .text(this.user.displayName)
                .addClass('show');

            this.switchTab('#logged-in');
            this.tab.$purchase.find('.go-back-button').attr('internal', '#logged-in');
        },

        userInfoFail: function(error)
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
                doneEvent: app.callbackHelper.create(function()
                {
                    self.userInfoDone.apply(self, arguments);
                }),
                failEvent: app.callbackHelper.create(self.userInfoFail)
            });
        },

        addSpinner: function($target, method)
        {
            var supportedMethods = ['html', 'append', 'prepend'];

            if(supportedMethods.indexOf(method) === -1)
                method = 'html'

            $target[method]('<div class="spinner"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>');
        },

        removeSpinner: function($target)
        {
            $target.find('.spinner').remove();
        },

        /*
         *      Common event listeners
         */

        registerCommonEventListeners: function()
        {
            var self = this;

            this.$chrome.on('click', '.external-browser', function(e)
            {
                var url = $(this).attr('href');
                app.bridge.trigger('externalBrowser', { url: url });

                e.preventDefault();
            });

            this.$chrome.on('click', '.tab-trigger', function(e)
            {
                self.switchTab($(this).attr('internal'));
                e.preventDefault();
            });
        },

        /*
         *      User related event listeners
         */

        loginDone: function(provider, $form)
        {
            this.getUserInfo(provider);
            $form.find('input[name="username"], input[name="password"]').blur();
        },

        loginFail: function(data)
        {
            console.log('loginFail', data);
        },

        logoutDone: function(provider)
        {
            // Re-fetch user info?
            console.log('user logged out from', provider);

            this.tab.$loggedIn.find('.spid-user-name')
                .text('')
                .removeClass('show');

            this.switchTab('#login');
            this.tab.$purchase.find('.go-back-button').attr('internal', '#login');
        },

        logoutFail: function(data)
        {
            console.log('logoutFail', data);
        },

        registerUserEventListeners: function()
        {
            var self = this;

            // Log in
            this.tab.$login.on('submit', 'form', function(e)
            {
                var $form = $(this);
                var provider = $form.data('provider');
                var username = $.trim($form.find('input[name="username"]').val());
                var password = $form.find('input[name="password"]').val();

                var $button = $form.find('input[type="submit"]');
                self.addSpinner($button, 'append');
                $button.addClass('active');

                var always = function()
                {
                    self.removeSpinner($button);
                    $button.removeClass('active');
                };

                app.bridge.trigger('login',
                {
                    provider: provider,
                    username: username,
                    password: password,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.loginDone.call(self, provider, $form);
                    }),
                    failEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.loginFail.apply(self, arguments);
                    });
                });

                e.preventDefault();
            });

            // Log out (not sure if this should be constrained to this tab only)
            this.tab.$loggedIn.on('click', '.logout', function(e)
            {
                var $button = $(this);
                var provider = $button.data('provider');

                self.addSpinner($button, 'append');
                $button.addClass('active');

                var always = function()
                {
                    self.removeSpinner($button);
                    $button.removeClass('active');
                };

                app.bridge.trigger('logout',
                {
                    provider: provider,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.logoutDone.call(self, provider);
                    }),
                    failEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.logoutFail.apply(self, arguments);
                    })
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

                var products = _.sortBy(data.products, 'price');
                $.each(products, function(i, product)
                {
                    var $productbutton = $(
                        '<button type="button" data-product-identifier="' + product.productIdentifier + '" data-provider="' + provider + '" class="button blue-button">' +
                            '<span class="title">' + product.title + ' ' + product.duration + '</span> ' +
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
            console.log('purchaseDone', provider);
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
                var provider = $button.data('provider');
                var productIdentifier = $button.data('product-identifier');

                var $button = $(this);
                self.addSpinner($button, 'append');
                $button
                    .addClass('active')
                .siblings()
                    .attr('disabled', 'disabled')
                    .addClass('disabled');

                var always = function()
                {
                    self.removeSpinner($button);
                    $button.add($button.siblings())
                        .removeClass('active disabled')
                        .removeAttr('disabled');
                };

                app.bridge.trigger('purchase',
                {
                    provider: provider,
                    productIdentifier: productIdentifier,
                    doneEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.purchaseDone.call(self, provider);
                    }),
                    failEvent: app.callbackHelper.create(function()
                    {
                        always();
                        self.purchaseFail.apply(self, arguments);
                    })
                });
            });

            // Restore purchases
            this.$chrome.on('click', '.restore-purchases', function(e)
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
        }
    };

    return Paywall;
});
