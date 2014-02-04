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

    var deviceHeight = window.screen.height;

    if(isMobile.Android())
        $('body').addClass('android');



    /*
     *      P A Y W A L L
     */

    var Paywall = function(args)
    {
        this.init(args);
    };

    Paywall.prototype.init = function()
    {
        window.nativeContext = this.getNativeContext();
        this.updateHeight();
        this.adjustLoginInputsIfMobile();
        this.registerPurchaseEventListeners();
    };

    Paywall.prototype.updateHeight = function()
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
    };

    Paywall.prototype.adjustLoginInputsIfMobile = function()
    {
        if(deviceHeight <= 480)
        {
            var $paywallLogin = $('#paywall-login');

            $('input')
                .focus(function()
                {
                    $paywallLogin.addClass('focus');
                })
                .blur(function()
                {
                    $paywallLogin.removeClass('focus');
                });
        }
    };

    Paywall.prototype.getNativeContext = function()
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
    };

    Paywall.prototype.registerPurchaseEventListeners = function()
    {
        // Choose a provider to buy from, ask its purchase alternatives
        $('#paywall-buy').on('click', 'button.in-app-purchase', function(e)
        {
            var $button = $(this);

            app.bridge.trigger('getPurchaseInfo',
            {
                provider: $button.data('provider'),

                doneEvent: app.callbackHelper.create(function(data)
                {
                    if('products' in data && data.products.length)
                    {
                        var $buttons = $('<div class="purchase-options"></div>');
                        $.each(data.products, function(i, product)
                        {
                            var $productbutton = $(
                            [
                                '<button type="button" data-product-identifier="' + product.productIdentifier + '" data-provider="' + $button.data('provider') + '" class="button blue-button no-mobile">',
                                    'Kjøp <span class="title">' + product.title + '</span> ',
                                    'for <span class="price">' + product.priceFormattedLocale + '</span>',
                                '</button>'
                            ].join(''));

                            $buttons.append($productbutton);
                        });

                        $('#paywall-products .purchase-options').html($buttons.html());
                    }
                }),

                failEvent: app.callbackHelper.create(function(data)
                {
                    console.log('getPurchaseInfoError', data);
                })
            });

            e.preventDefault();
        });

        // Choose one of the provider’s purchase alternatives
        $('#paywall-products').on('click', '.purchase-options button', function()
        {
            var $button = $(this);

            app.bridge.trigger('purchase',
            {
                provider: $button.data('provider'),
                productIdentifier: $button.data('product-identifier'),

                doneEvent: app.callbackHelper.create(function()
                {
                    // Display purchase success message
                    // Log out..?
                }),

                failEvent: app.callbackHelper.create(function(data)
                {
                    console.log('purchase failed', data);
                })
            });
        });
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

    return paywall;
});
