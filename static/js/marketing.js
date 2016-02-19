require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',

        TweenMax: 'libs/TweenMax',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',

    'TweenMax',
    'base'
], function($, jqueryui, bootstrap, TweenMax) {

    'use strict';

    if(navigator.userAgent.match(/Trident\/7\./)){
        // Disable smooth scroll on mousewheel scroll on IE
        // For fixed background image
        $('body').on("mousewheel", function () {
            // remove default behavior
            event.preventDefault();

            //scroll without smoothing
            var wheelDelta = event.wheelDelta;
            var currentScrollPosition = window.pageYOffset;
            window.scrollTo(0, currentScrollPosition - wheelDelta);
        });
    }


    // ==========================
    // Building a paranav plugin to handle parallax navigation
    // and parallax animation, solving parallax jittery issues
    // of mousewheel scroll on Chrome and safari

    var Paranav = function (element, options) {
        var $this = this;
        this.options = $.extend({}, Paranav.DEFAULT, options);
        this.$element = $(element);
        this.target = $(element).attr('data-target');
        this.opacity = 50;

        if(!this.target){
            this.target = $(element).attr('href');
            this.target = this.target.replace(/.*(?=#[^\s]+$)/, ''); //strip for ie7
        }
        this.$target = $(this.target);
        this.targetPosition = this.$target.offset().top;
        this.height = this.$target.outerHeight();

        $this.checkCurrentPosition();

        $(element).on('click', function(e){$this.scrollTo(e)});
        $(window).on('resize scroll', function () {$this.checkCurrentPosition();});
    };

    Paranav.DEFAULT = {
        duration: 500,
        offset: 50,
        fixedHeader: true
    };
    Paranav.prototype.scrollTo = function (e) {
        var $this = this;
        var position = $this.targetPosition - $this.options.offset;

        e.preventDefault();

        // Scroll to target position on click
        $('html, body').animate({
            scrollTop: position
        }, $this.options.duration, function(){
            // focus out from the click event
            e.target.blur();
        });
    };
    Paranav.prototype.checkCurrentPosition = function () {
        // Responding navigation's style based on target section's position
        // in view port
        //var $this = this;
        if(this._checkTargetInViewPort(this.$target)){
            this.$element.addClass('active');
            this.$target.addClass('is-inview');
        }else{
            this.$element.removeClass('active');
            this.$target.removeClass('is-inview');
        }
    };
    Paranav.prototype._checkTargetInViewPort = function ($target) {
        var targetrect = $target[0].getBoundingClientRect();
        var viewCenter = (window.innerHeight || document.documentElement.clientHeight) * 0.5;

        // return true if the horizontal center of the screen intersects with the target element
        return viewCenter > targetrect.top && viewCenter < targetrect.bottom;
    };

    // Paranav plugin definition
    var old = $.fn.paranav;

    $.fn.paranav = function(option){
        return this.each(function(){
            var $this = $(this);
            var options = $.extend({}, Paranav.DEFAULT, option);

            var data  = $this.data('bs.parnav')

            if (!data) $this.data('bs.paranav', (data = new Paranav(this, options)))
        })
    }
    $.fn.paranav.Constructor = Paranav;

    // Paranav no conflict
    $.fn.paranav.noConflict = function () {
        $.fn.paranav = old;
        return this;
    }

    var navs = '[data-ride="paranav"]';
    var headerHeight = $('.site-header').outerHeight();
    $(navs).paranav({offset: headerHeight});

    function _checkTargetInViewPort ($target, restriction) {
        var targetrect = $target[0].getBoundingClientRect();
        var viewPortHeight = window.innerHeight || document.documentElement.clientHeight;

        // check target element's top is above the center of the view port
        // or its bottom is bellow the center of the view port
        return (targetrect.top >= 0 && targetrect.top <= viewPortHeight * 2 /3) || (targetrect.bottom <= viewPortHeight && targetrect.bottom > 0);
    };

    function _getRandom(min, max){
        return min + Math.random() * (max - min);
    }

    function scrollanimation (selector, animationUp, animationDown, isScrollingUp) {
        //if selector is in view animate
        if(_checkTargetInViewPort(selector)){
            // scroll up animation
            if(isScrollingUp > 0){
                TweenMax.to(selector, 1, animationUp)
            }else{
            //  scroll down animation
                TweenMax.to(selector, 1, animationDown)
            }
        }
    }

    var lastScroll = 0;
    $(document).on('scroll', function(){
        var currentScroll = $(this).scrollTop();
        var direction = currentScroll - lastScroll;
        var delay =0.15;
        var ease = Power2.easeOut;
        var animationTransformYDown = {y: 0, delay: delay, ease: Power2.easeOut};
        var animationOpacityDown = {opacity: '0.6', y:0, delay: delay, ease: Power2.easeOut};
        var animationOpacityUp = {opacity: "+=0.1", y: "-=3px", delay: delay, ease: ease}

        scrollanimation($('#overview .image-0'), {y: "-=4px", delay: delay, ease: ease}, animationTransformYDown, direction);
        scrollanimation($('#overview .fixed-image-1'), {y: "-=16px", delay: delay, ease: ease}, animationTransformYDown, direction);
        scrollanimation($('#overview .fixed-image-2'), {y: "-=8px", delay: delay, ease: ease}, animationTransformYDown, direction);
        scrollanimation($('#overview .fixed-image-3'), {y: "-=12px", delay: delay, ease: ease}, animationTransformYDown, direction);

        scrollanimation($('#features .set1'), animationOpacityUp, animationOpacityDown, direction);
        scrollanimation($('#features .set2'), animationOpacityUp, animationOpacityDown, direction);

        scrollanimation($('#getting-started .image-0'), {y: "-=3px", delay: delay, ease: ease}, animationTransformYDown,direction)
        scrollanimation($('#getting-started .fixed-image-4'), {y: "-=12px", delay: delay, ease: ease}, animationTransformYDown, direction);
        scrollanimation($('#getting-started .fixed-image-5'), {y: "-=6px", delay: delay, ease: ease}, animationTransformYDown,direction);
        scrollanimation($('#getting-started .fixed-image-6'), {y: "-=9px", delay: delay, ease: ease}, animationTransformYDown,direction);

        lastScroll = currentScroll;
    });

    // share on social channel
    $('a.social').on('click', function (e) {
        e.preventDefault();

        var url = encodeURI($(this).attr('href'));
        var clientWidth = window.innerWidth || document.documentElement.clientWidth;
        var clientHeight = window.innerHeight || document.documentElement.clientHeight;

        var winWidth = (clientWidth > 580) ? 580 : 320;
        var winHeight = 300;

        var top = clientHeight/2 - winHeight/2;
        var left = clientWidth/2 - winWidth/2;

        return window.open(url, "sharer", 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+winWidth+', height='+winHeight+', top='+top+', left='+left);
    });
})

