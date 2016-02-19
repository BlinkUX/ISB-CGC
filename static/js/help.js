require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        text: 'libs/require-text',
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
], function($, jqueryui, bootstrap) {
    'use strict';

    $("#help-submit").click(function(event){
        var csrftoken   = get_cookie('csrftoken');
        var url         = $('#help-action-url').val();
        var params      = {};

        params['email']         = $.trim($("#email").val());
        params['description']   = $.trim($("#description").val());

        $("#help-error-warning").fadeOut();
        $("#help-missing-email-warning").fadeOut();
        $("#help-missing-question-warning").fadeOut();

        var isValid = true;
        if(params['email'].length == 0){
            $("#help-missing-email-warning").fadeIn();
            isValid = false;
        }
        if(params['description'].length == 0) {
            $("#help-missing-question-warning").fadeIn();
            isValid = false;
        }
        if(isValid) {
            $.ajax({
                type     : 'POST',
                url      : url,
                data     : params,
                datatype : "json",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                },
                success: function (res) {
                    $("#help-modal").modal('hide');
                    $("#thank-you-modal").modal('show');
                },
                error: function () {
                    $("#help-error-warning").fadeIn();
                }
            });
        }
    });

    /*
        Used for getting the CORS token for submitting data
     */
    function get_cookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
