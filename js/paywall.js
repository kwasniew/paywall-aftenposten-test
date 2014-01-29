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
        var paywallHeight = $('#paywallInner').height();
        app.bridge.trigger('paywallLoaded', {
            'height': paywallHeight
        });

        console.log('Paywall height = ' + paywallHeight);
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

    $(document).ready(function()
    {
        updatePaywallHeight();
        checkDeviceHeightAndAdjustInputIfNeeded();
        console.log('Device height = ' + deviceHeight);
    });









    // PAYWALL
    var paywall = {};

    app.event.on('updatePaywall', function(args)
    {
        // Cache DOM elements
        var $loginOrSignupWall = $('#login-or-signup-wall');
        var $purchaseWithProductsWall = $('#purchase-with-products-wall');

        var gotProducts = typeof args.products !== 'undefined' && args.products.length > 0;
        var wall = gotProducts ? $purchaseWithProductsWall : $loginOrSignupWall;
        var otherWall = !gotProducts ? $purchaseWithProductsWall : $loginOrSignupWall;
        var animDuration = args.animated ? 300 : 0;
        var fullName = args.userInfo.spid.displayName;
        var isLoggedIn = fullName || fullName === '' ? true : false;
        var $activePaywallElement = isLoggedIn ? $('#paywall-logged-in') : $('#paywall-login');
        var paywallHeight = $('#paywallInner').height();

        $('.paywall-tab.open').removeClass('open');
        $activePaywallElement.addClass('open');

        var $subscriberLink = $("a[id*='subscriber-link']");

        if(isLoggedIn)
        {
            $('.getSpidUserName').text(fullName);
            $subscriberLink.attr('intern', '#paywall-logged-in');
        }
        else
            $subscriberLink.attr('intern', '#paywall-login');

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


    // Paywall asks for info when clicking a button
    app.event.on('purchaseInfo', function(data)
    {
        $.each(data.products, function(product)
        {

        });

        // Loop through list of products, generate DOM
        // Add DOM to the document
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
        var $toShow = $($(this).attr('intern'));

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
