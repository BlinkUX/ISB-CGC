/**
 *
 * Copyright 2015, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
/**
 * Created by rossbohner on 12/9/15.
 */
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
        d3: 'libs/d3.min',
        d3tip: 'libs/d3-tip',
        science: 'libs/science.min',
        stats: 'libs/science.stats.min',
        vizhelpers: 'helpers/vis_helpers',
        select2: 'libs/select2.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'select2': ['jquery']
    }
});

require([
    'jquery',
    'visualizations/plotFactory',
    'science',
    'stats',
    'session_security',
    'jqueryui',
    'bootstrap',
    'd3',
    'd3tip',
    'vizhelpers',
    'visualizations/createScatterPlot',
    'visualizations/createCubbyPlot',
    'visualizations/createViolinPlot',
    'visualizations/createHistogram',
    'visualizations/createBarGraph',
    'select2',
    'assetscore',
    'assetsresponsive',
    'base'
], function ($, plot_factory, science, stats, session_security) {

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var forms = $(this).find('form');
        if(forms.length)
            _.each(forms, function (form) {
                form.reset();
            });
    });

    $('#clin-accordion').on('show.bs.collapse', function (e) {
        $(e.target).siblings('a').find('i.fa-caret-down').show();
        $(e.target).siblings('a').find('i.fa-caret-right').hide();

    });

    $('#clin-accordion').on('hide.bs.collapse', function (e) {
        $(e.target).siblings('a').find('i.fa-caret-right').show();
        $(e.target).siblings('a').find('i.fa-caret-down').hide()
    });

    $('.show-more').on('click', function() {
        $(this).siblings('li.extra-values').show();
        $(this).siblings('.show-less').show();
        $(this).hide();
    });

    $('.show-less').on('click', function() {
        $(this).siblings('li.extra-values').hide();
        $(this).siblings('.show-more').show();
        $(this).hide();
    });

    // comments interactions
    $('.show-flyout').on('click', function() {
        var target = $(this).closest('.worksheet').find('.comment-flyout');
        $(target).animate({
            right: '-1px'
        }, 800).toggleClass('open');
    });
    $('.hide-flyout').on('click', function() {
        $(this).parents('.fly-out').animate({
            right: '-400px'
        }, 800, function(){
            $(this).removeClass('open');
        })
    });

    // settings flyout interactions
    $('.show-settings-flyout').on('click', function() {
        var target = $(document).find('.settings-flyout');
        $(target).animate({
            right: '-1px'
        }, 800).toggleClass('open');
    });
    $('.hide-settings-flyout').on('click', function() {
        $(this).parents('.fly-out.settings-flyout').animate({
            right: '-400px'
        }, 800, function(){
            $(this).removeClass('open');
        })
    });

    $('.dropdown-menu').find("[data-toggle='modal']").click(function(){
        //$(this.getAttribute("data-target")).modal();
        console.log($(this.getAttribute("data-target")));
    })

    ////Model communications
    $('.add_worksheet_comment_form').on('submit', function(event) {
        event.preventDefault();
        var form        = this;
        var workbookId  = $(form).find("#workbook_id_input").val();
        var worksheetId = $(form).find("#worksheet_id_input").val();
        var url         = base_url + '/workbooks/' + workbookId + '/worksheets/' + worksheetId + '/comments/create';

        $.ajax({
            type : 'POST',
            url  : url,
            data : $(this).serialize(),
            success: function(data) {
                data = JSON.parse(data);
                $('.comment-flyout .flyout-body').append('<h5 class="comment-username">' + data['first_name'] + ' ' + data['last_name'] + '</h5>');
                $('.comment-flyout .flyout-body').append('<p class="comment-content">' + data['content'] + '</p>')
                $('.comment-flyout .flyout-body').append('<p class="comment-date">' + data['date_created'] + '</p>');

                form.reset();
            },
            error: function() {
                console.log('Failed to save comment.');
                $('.comment-flyout .flyout-body').append('<p class="comment-content error">Fail to save comment. Please try back later.</p>')
                form.reset()
            }

        });

        return false;
    });

    $('.worksheet-nav-toggle').on('click', function(e){
        e.preventDefault();
        $(this).parent().toggleClass('open');
        $(this).toggleClass('open');
        $(this).parent().prev('.worksheet-nav').toggleClass('closed');
    })

    // tabs interaction on dropdown selected
    var tabsList = $('#worksheets-tabs a[data-toggle="tab"]');

    tabsList.on('shown.bs.tab', function(e){
        var targetTab = $(this).parent();
        var targetWorksheetNumber = $(this).attr('href');

        if($(this).closest('#more-tabs').length > 0){
            openTabsfromDropdown(targetTab);
        }
        e.preventDefault();
    })

    function openTabsfromDropdown(target){
        var lastTabNum = 3;
        var lastTab = $(tabsList[lastTabNum-1]).parent();
        var moreTabs = $('#more-tabs');
        var dropdown = $('#worksheets-dropdown-menu');

        moreTabs.before(target);
        moreTabs.removeClass('active');
        lastTab.removeClass('active');
        dropdown.prepend(lastTab);
        tabsList = $('#worksheets-tabs a[data-toggle="tab"]');
    }


    // Activate the recent added tab
    if(display_worksheet){
        var recentWorksheetTab = $("a[href='#"+ display_worksheet +"']");
        var recentWorksheetTarget = recentWorksheetTab.parent();
        //$(tabsList[0]).parent().removeClass('active');
        if(recentWorksheetTarget.closest('#more-tabs').length > 0){
            openTabsfromDropdown(recentWorksheetTarget);
        }
    }

    //search_helper_obj.update_counts(base_api_url, 'metadata_counts', cohort_id);
    //search_helper_obj.update_parsets(base_api_url, 'metadata_platform_list', cohort_id);


    function generatePlot(){
        var plot_element = $('.plot');
        var plot_type = $("#plot_selection").find(":selected").text();
        var x_attr = plot_element.find('#x-axis-select')[0].selectedIndex > 0 ? plot_element.find('#x-axis-select').find(":selected").val() : "";
        var y_attr = plot_element.find('#y-axis-select')[0].selectedIndex > 0 ? plot_element.find('#y-axis-select').find(":selected").val() : "";
        var cohort = plot_element.find('#cohort-select')[0].selectedIndex > 0 ? plot_element.find('#cohort-select').find(":selected").val() : "";
        var plotFactory = Object.create(plot_factory, {});
        plotFactory.generate_plot(plot_element, x_attr, y_attr, 'CLIN:Study', cohort, false);
    }

    //generate plot based on user change
    $('.update-plot').on('click', function(event){
        generatePlot();
        $('.hide-settings-flyout').parents('.fly-out.settings-flyout').animate({
            right: '-400px'
        }, 800, function(){
            $(this).removeClass('open');
        })
    });

    //generate plot type selection
    $("#plot_selection").on("change", function(event){
        generatePlot();
    });



    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.ajax-form-modal').find('form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this),
            fields = $this.serialize();

        $this.find('.btn').addClass('btn-disabled').attr('disabled', true);
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST'
        }).then(function () {
            $this.closest('.modal').modal('hide');
            if($this.data('redirect')) {
                window.location = $this.data('redirect');
            } else {
                window.location.reload();
            }
        }, function () {
            $this.find('.error-messages').append(
                $('<p>')
                    .addClass('alert alert-danger')
                    .text('There was an error deleting that study. Please reload and try again, or try again later.')
            );
        })
        .always(function () {
            $this.find('.btn').removeClass('btn-disabled').attr('disabled', false);
        });
    });
});

