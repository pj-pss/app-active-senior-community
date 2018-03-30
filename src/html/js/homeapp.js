/**
 * Personium
 * Copyright 2018 FUJITSU LIMITED
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * The followings should be shared among applications.
 */

$(function () {
    /*-------------------------main page(From here)-------------------------*/
    var timer = false;
    $(window).on('resize', function () {
        if (timer !== false) {
            clearTimeout(timer);
        }
        timer = setTimeout(function () {
            var container_w = $('.app-list').outerWidth(true);
            var content_w = $('div.app-list div.app-icon:eq(0)').outerWidth(true);
            var padding = (container_w % content_w) / 2;
            $('.app-list').css('padding-left', padding);
        }, 50);
    }).resize();

    //もう一度ボタンが押された場合
    $('#logout').on('click', function () {
        $('#exampleModal').modal('show');
    });

    /*-------------------------main page(To here)-------------------------*/

    /*-------------------------profile page(From here)-------------------------*/
    /*Edit button clicked action*/
    $('.edit-btn').on('click', function () {
        if ($(this).attr('id') == 'user-name-edit-btn') {
            Control_Input_Editer($(this), $('#user-name-form'));
        } else if ($(this).attr('id') == 'description-edit-btn') {
            Control_Input_Editer($(this), $('#description-form-area'));
        }
    })

    /**
     * Control_Input_Editer
     * param:
     * pushed_btn -> Pushed Edit Button
     * target_input -> Want To Edit Input Box
     */
    function Control_Input_Editer(pushed_btn, target_input) {
        var edit_ic = pushed_btn.find('.fa-edit');
        var check_ic = pushed_btn.find('.fa-check');

        if (!(pushed_btn.hasClass('editing'))) {
            pushed_btn.addClass('editing');
            edit_ic.removeClass('fa-edit');
            edit_ic.addClass('fa-check');
            target_input.attr('disabled', false);
            target_input.focus();
        } else {
            pushed_btn.removeClass('editing');

            check_ic.removeClass('fa-check');
            check_ic.addClass('fa-edit');

            target_input.blur();
            target_input.attr('disabled', true);
        }
    }
    /*-------------------------profile page(To here)-------------------------*/

    /*-------------------------account page(From here)-------------------------*/

    /*-------------------------account page(To here)-------------------------*/
})