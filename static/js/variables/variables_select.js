require.config({
    baseUrl: '/static/',
    paths: {
        jquery: 'js/libs/jquery-1.11.1.min',
        bootstrap: 'js/libs/bootstrap.min',
        jqueryui: 'js/libs/jquery-ui.min',
        session_security: 'js/session_security',
        underscore: 'js/libs/underscore-min',
        assetscore: 'js/libs/assets.core',
        assetsresponsive: 'js/libs/assets.responsive',
        base: 'js/base',
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
    var warning = false;
    $('input[type="checkbox"]').on('click', function() {
         if ($('input[type="checkbox"]:checked').length > 1 && !warning) {
             $.createMessage('Only one variable list can be used to create workbook.', 'warning');
             warning = true;
         }
    });
    $('#addToNewAnalysis').on('click', function (event) {
        //get the selected cohort
        var variable_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                variable_lists.push($(this).val());
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(variable_lists.length > 0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                url         : base_url + '/workbooks/create_with_variables',
                data        : {json_data: JSON.stringify({variable_list_id: variable_lists})},
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = base_url + '/workbooks/' + data.workbook_id + '/worksheets/' + data.worksheet_id + '/';
                    } else {
                        console.log('Failed to add variables to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add variables to workbook');
                }
            });
        }
    });

    // Clear all entered genes list on click
    $('#addToAnalysis').on('click', function (event) {
        //get the selected cohort
        var variable_lists = [];
        $('input[type="checkbox"]').each(function() {
            if ($(this).is(':checked') && $(this).val() != 'on') {
                variable_lists.push({ id : $(this).val()});
            }
        });
        var workbook_id  = $('#workbook_id').val();
        var worksheet_id = $('#worksheet_id').val();

        if(variable_lists.length > 0){
            var csrftoken = get_cookie('csrftoken');
            $.ajax({
                type        : 'POST',
                dataType    :'json',
                url         : base_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + "/variables/edit",
                data        : JSON.stringify({var_favorites : variable_lists}),
                beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success : function (data) {
                    if(!data.error) {
                        window.location = base_url + '/workbooks/' + workbook_id + '/worksheets/' + worksheet_id + '/';
                    } else {
                        console.log('Failed to add variable list to workbook');
                    }
                },
                error: function () {
                    console.log('Failed to add variable list to workbook');
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

});/**
 * Created by rossbohner on 12/30/15.
 */
