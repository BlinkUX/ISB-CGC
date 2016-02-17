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

    //on initialization, check to see if there is an overage
    var availableStorage = $("#max-usage").val() - $("#current-usage").val();
    check_overage();
    function check_overage(){
        function get_size_string(size){
            var str_size;
            if(size > 1000000) {
                str_size = Math.floor(size / 1000000) + " MB";
            } else if (size > 1000){
                str_size = Math.floor(size / 1000) + " kB";
            } else {
                str_size = size + " bytes";
            }
            return str_size;
        }

        var totalSize = 0;
        $(".file").each(function(i, element){
            if(element.getAttribute("ignore") != "true") {
                totalSize += element.getAttribute("size");
            }
        })

        $("#total-size").text(get_size_string(totalSize));
        if (totalSize > availableStorage){
            $("#no-file-warning").fadeOut();
            $("#total-size-warning").fadeIn();
            $("#upload-button-new").prop("disabled", true);
            $("#upload-button").prop("disabled", true);
            $("#overage-size").text(get_size_string(totalSize - availableStorage));
        } else if (totalSize == 0) {
            $("#no-file-warning").fadeIn();
            $("#upload-button-new").prop("disabled", true);
            $("#upload-button").prop("disabled", true);
        } else {
            $("#no-file-warning").fadeOut();
            $("#total-size-warning").fadeOut();
            $("#upload-button-new").prop("disabled", false);
            $("#upload-button").prop("disabled", false);
        }
    }

    $(".file-removal").click(function(event){
        //assuming structure <tr><td><i></td></tr>
        if($(this).parent().parent().attr("ignore") == "true"){
            $(this).parent().parent().attr("ignore", false);
            $(this).parent().parent().removeClass("message");
            $(this).parent().parent().removeClass("line-through");
            $(this).removeClass("fa-plus");
            $(this).addClass("fa-close");
            $(this).addClass("text-danger");
        } else {
            $(this).parent().parent().attr("ignore", true);
            $(this).parent().parent().addClass("message");
            $(this).parent().parent().addClass("line-through");
            $(this).addClass("fa-plus");
            $(this).removeClass("fa-close");
            $(this).removeClass("text-danger");
        }
        check_overage();
    })

    function file_import(params){
        var csrftoken = get_cookie('csrftoken');
        var url = $('#action-url').val();
        params['access_token'] = $("#access-token").val();
        params['session_uri']  = $("#session-uri").val();
        var files = [];
        $("#file-table").find(".file").each(function(i, ele){
            if(ele.getAttribute("name") != "" && ele.getAttribute("ignore") != "true" ) {
                files.push({"name": ele.getAttribute("name"), "size" : ele.getAttribute("size"), "href": ele.getAttribute("href")});
            }
        })
        params['files'] = JSON.stringify(files);
        params['data-type'] = 'basespace';

        if(params['project-type'] == "new"){
            $("#upload-button-new").addClass("hidden");
            $("#upload-button-new-importing").removeClass("hidden");
        } else {
            $("#upload-button").addClass("hidden");
            $("#upload-button-importing").removeClass("hidden");
        }
        $.ajax({
            type : 'POST',
            url  : url,
            data : params,
            datatype : "json",
            beforeSend : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (res) {
                if(params['project-type'] == "new"){
                    $("#upload-button-new").removeClass("hidden");
                    $("#upload-button-new-importing").addClass("hidden");
                } else {
                    $("#upload-button").removeClass("hidden");
                    $("#upload-button-importing").addClass("hidden");
                }

                $("#success-modal").find("#project-name").text(res.project_name);
                $("#success-modal").find("#study-name").text(res.study_name);
                $("#success-modal").find("#redirect").attr('href', res.redirect_url);
                $("#success-modal").modal({backdrop : 'static', keyboard : false})
            },
            error: function () {

            }
        });
    }

    //new projects
    $('#upload-button-new').click(function(){
        if($(this).hasClass('disabled'))
            return;

        $("#validate-warning").css("display","none");

        var params = {};
        params['project-type'] = "new";
        params['project-name'] = $.trim( $('#project-name').val());
        params['project-description'] = $.trim( $('#project-description').val());
        if(params['project-name'].length == 0){
            $("#validate-warning").fadeIn()
        } else {
            //taken from the basespace
            params['study-name'] = $('#bs-project-name').val();
            params['study-description'] = $('#bs-project-description').val();

            file_import(params);
        }
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
