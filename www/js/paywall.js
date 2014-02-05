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
            this.registerPurchaseEventListeners();
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

            $('#paywall-content').css('height', Math.max.apply(Math, arr));

            // Set paywall height
            var paywallHeight = $('.paywall-inner').height();
            app.bridge.trigger('paywallLoaded', {
                'height': paywallHeight
            });
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

                console.log($buttons);

                $target.html($buttons.html());
            }
        },

        purchaseInfoFail: function(data)
        {
            console.log('getPurchaseInfoError', data);
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
            console.log('purchase failed', data);
        },

        // Choose a provider to buy from, ask its purchase alternatives
        registerPurchaseEventListeners: function()
        {
            var self = this;

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
        },

        addSpinner: function($target)
        {
            $target.append('<div class="spinner"></div>');
        }
    };

    $(document).ready(function()
    {
        var paywall = new Paywall();
    });

    $('#chrome').on('touchmove, touchstart', function()
    {
        $('.layer-content').removeClass('overflowHidden');
    });

    $('.restore-purchases').click(function()
    {
        app.bridge.trigger('login', { 'provider': 'itunes' });
        return false;
    });

    $('.paywall-subscribe').click(function()
    {
        app.bridge.trigger('register', { 'provider': null });
        return false;
    });

    $('.paywall-logout').click(function()
    {
        app.bridge.trigger('logout', { 'provider': 'spid' });
        return false;
    });

    $('.externalBrowser').click(function()
    {
        app.bridge.trigger('externalBrowser', { 'url': $(this).attr('href') });
        return false;
    });

    $('#paywall-login form').bind('submit', function()
    {
        app.bridge.trigger('login',
        {
            'provider': 'spid',
            'username': $(this).find('input[name="username"]').val(),
            'password': $(this).find('input[name="password"]').val()
        });

        return false;
    });

    $('.paywall-tab-trigger').click(function()
    {
        var $toShow = $($(this).attr('internal'));

        $('.paywall-tab.open').removeClass('open');
        $('.paywall-tab-trigger.open').removeClass('open');
        $toShow.addClass('open');
        $(this).addClass('open');

        return false;
    });

    $('.active-tab').click(function()
    {
        var $activeTab = $($(this).attr('active-tab'));
        $activeTab.addClass('open');

        return false;
    });

    return {};
});
