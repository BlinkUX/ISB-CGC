require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        base: 'base',
        text: 'libs/require-text',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'assetscore',
    'assetsresponsive',
    'base',
], function($, jqueryui, bootstrap, session_security, _) {
    'use strict';

    function file_import(params){
        var csrftoken = get_cookie('csrftoken');
        var url = $('#action-url').val();
        params['access_token'] = $("#access-token").val();
        params['session_uri']  = $("#session-uri").val();
        var files = [];
        $("#file-table").find(".file").each(function(i, ele){
            if(ele.getAttribute("name") != "") {
                files.push({"name": ele.getAttribute("name"), "size" : ele.getAttribute("size"), "href": ele.getAttribute("href")});
            }
        })
        params['files'] = JSON.stringify(files);
        params['data-type'] = 'basespace';

        $.ajax({
            type : 'POST',
            url  : url,
            data : params,
            datatype : "json",
            beforeSend : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (res) {
                console.log(res);
                location.href = res.redirect_url;
            },
            error: function () {

            }
        });
        //$.ajax({
        //    url: url,
        //    type: 'POST',
        //    data: form,
        //    processData: false,
        //    contentType: false,
        //}).done(function (res) {
        //    console.log('Response: ', res);
        //    if(res.status === 'success') {
        //        $('#base-data-form')[0].reset();
        //        location.href = res.redirect_url;
        //    } else {
        //        errorMessage('Error submitting response' + res.message);
        //    }
        //}).fail(function () {
        //    errorMessage('We had an error submitting the response. Please try again later');
        //}).always(function () {
        //    $('#upload-button, #back-button').removeClass('disabled')
        //        .siblings('.progress-message').addClass('hidden');
        //});
    }

    //new projects
    $('#upload-button-new').click(function(){
        if($(this).hasClass('disabled'))
            return;

        //if(!validateSectionTwo())
        //    return;
        //
        //$('#upload-button, #back-button').addClass('disabled')
        //    .siblings('.progress-message').removeClass('hidden');

        var params = {};
        params['project-type'] = "new";
        params['project-name'] = $.trim( $('#project-name').val());
        params['project-description'] = $.trim( $('#project-description').val());

        //taken from the basespace
        params['study-name'] = $('#bs-project-name').val();
        params['study-description'] = $('#bs-project-description').val();

        file_import(params);
    })

    //existing projects
    $('#upload-button').click(function(){
        var params = {};
        params['project-type'] = "existing";
        params['project-id'] = $('input[name=project-selection]:checked').val();
        params['study-name'] = $('#bs-project-name').val();
        params['study-description'] =$('#bs-project-description').val();
        file_import(params);
    })

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
