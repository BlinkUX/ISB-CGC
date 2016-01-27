require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',

        skrollr: 'libs/skrollr.min',
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
    'base'
], function($, jqueryui, bootstrap, skrollr) {

    'use strict';

    var s = skrollr.init();
})