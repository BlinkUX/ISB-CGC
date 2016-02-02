require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',

        skrollr: 'libs/skrollr',
        rx: 'libs/rx.lite',
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
    'skrollr',
    'rx',
    'base'
], function($, jqueryui, bootstrap, skrollr, rx) {

    'use strict';

    //skrollr.init();

    if(navigator.userAgent.match(/Trident\/7\./)){
        // Disable smooth scroll on mousewheel scroll on IE
        // For fixed background image
        console.log('no smooth scrolling');
        $('body').on("mousewheel", function () {
            // remove default behavior
            event.preventDefault();

            //scroll without smoothing
            var wheelDelta = event.wheelDelta;
            var currentScrollPosition = window.pageYOffset;
            window.scrollTo(0, currentScrollPosition - wheelDelta);
        });
    }


    console.log(navigator);

    var navs = '[data-ride="paranav"]';

    var Paranav = function(element, options){
        var $this = this;
        this.options = $.extend({}, Paranav.DEFAULT, options);
        this.$element = $(element);
        this.target = $(element).attr('data-target');

        if(!this.target){
            this.target = $(element).attr('href');
            this.target = this.target.replace(/.*(?=#[^\s]+$)/, ''); //strip for ie7
        }
        this.$target = $(this.target);
        this.targetPosition = this.$target.offset().top;
        this.height = this.$target.outerHeight();

        console.log(this);
        $(element).on('click', function(e){$this.scrollTo(e)});
        $(document).on('scroll', function(e){$this.checkCurrentPosition(e)});
    };

    Paranav.DEFAULT = {
        duration: 500,
        offset: 50,
        fixedHeader: true
    };
    Paranav.prototype.scrollTo = function(e){
        var $this = this;
        var position = $this.targetPosition - $this.options.offset;

        e.preventDefault();

        // Scroll to target position on click
        $('html, body').animate({
            scrollTop: position
        }, $this.options.duration);

        //Add class to both navigation and target element
        this.$element.addClass('active');
        this.$target.addClass('is-inview');
    };
    Paranav.prototype.checkCurrentPosition = function(e){

        var documentPosition = $(document).scrollTop() + this.options.offset;
        var targetRect = this.$target[0].getBoundingClientRect();
        console.log('document: ' + documentPosition);
        console.log('targetTop: ' + targetRect.top);
        console.log('targetHeight: ' + targetRect.bottom);
        if((targetRect.top >= 0 && targetRect.top < window.innerHeight/2) || (targetRect.bottom <= window.innerHeight/2 && targetRect.bottom > window.innerHeight/2)){
            this.$element.addClass('active');
            this.$target.addClass('is-inview');
        }else{
            this.$element.removeClass('active');
            this.$target.removeClass('is-inview');
        }
    }
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

    var headerHeight = $('.site-header').outerHeight();
    $(navs).paranav({offset: headerHeight});
})

