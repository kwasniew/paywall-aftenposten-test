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

    function updatePaywallHeight()
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
    }

    function checkDeviceHeightAndAdjustInputIfNeeded()
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
    }

    var getNativeContext = function()
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

    $(document).ready(function()
    {
        window.nativeContext = getNativeContext();
        updatePaywallHeight();
        checkDeviceHeightAndAdjustInputIfNeeded();
    });









    // PAYWALL
    var paywall = {};

    app.event.on('updatePaywall', function(args)
    {
        // Cache DOM elements
        var $paywall = $('#paywall');

        var gotProducts = typeof args.products !== 'undefined' && args.products.length > 0;
        var otherWall = !gotProducts ? $paywall : $loginOrSignupWall;
        var animDuration = args.animated ? 300 : 0;
        var fullName = args.userInfo.spid.displayName;
        var isLoggedIn = fullName || fullName === '' ? true : false;
        var $activePaywallElement = isLoggedIn ? $('#paywall-logged-in') : $('#paywall-login');
        var paywallHeight = $('.paywall-inner').height();

        $('.paywall-tab.open').removeClass('open');
        $activePaywallElement.addClass('open');

        var $subscriberLink = $("a[id*='subscriber-link']");

        if(isLoggedIn)
        {
            $('.getSpidUserName').text(fullName);
            $subscriberLink.attr('internal', '#paywall-logged-in');
        }
        else
            $subscriberLink.attr('internal', '#paywall-login');

        if(gotProducts)
        {
            $.each(args.products, function(i, product)
            {
                var $product = $('[pid="' + product.productIdentifier + '"]');
                var $productPrice = $product.find('.paywall-product-price');
                $productPrice.text(product.priceFormattedLocale);
            });
        }

        console.log('Updated paywall');
    });


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



    $('#chrome').on('touchmove, touchstart', function()
    {
        console.log('Touched paywall');
        $('.layer-content').removeClass('overflowHidden');
    });

    $('.paywall-buy-product').click(function()
    {
        var productIdentifier = $(this).attr('productIdentifier');
        productIdentifier = "com.ivyengine.aftenpostenmonthly";

        app.bridge.trigger('buy',
        {
            'provider': null,
            'productIdentifier': productIdentifier
        });

        return false;
    });

    $('.paywall-restore').click(function()
    {
        app.bridge.trigger('login', { 'provider': 'itunes' });
        return false;
    });

    $('.paywall-subscribe').click(function()
    {
        console.log('User wants access - register');

        app.bridge.trigger('register', { 'provider': null });
        return false;
    });

    $('.paywall-logout').click(function()
    {
        console.log('User wants to logout - logout');

        app.bridge.trigger('logout', { 'provider': 'spid' });
        return false;
    });

    $('.externalBrowser').click(function()
    {
        var url = $(this).attr('href');

        console.log('Open external browser = ' + url);

        app.bridge.trigger('externalBrowser', { 'url': url });
        return false;
    });

    $('#paywall-login form').bind('submit', function(e)
    {
        console.log('User wants access - login');

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
