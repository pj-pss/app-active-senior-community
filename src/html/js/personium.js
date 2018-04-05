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

  Drawer_Menu();
  Control_Slide_List();
  Sort_Menu();

  /**
   * Drawer_Menu
   * param:none
   */
  function Drawer_Menu() {
    $('#drawer_btn').on('click', function () {
      $('#menu-background').show();
      $('#drawer_menu').animate({
        width: 'show'
      }, 300);
      return false;
    });

    $('#menu-background').click(function () {
      $('#drawer_menu').animate({
        width: 'hide'
      }, 300, function () {
        $('#menu-background').hide();
        return false;
      });
    });

    $('#drawer_menu').click(function (event) {
      event.stopPropagation();
    });
  }

  /**
   * Sort_Menu
   * param:none
   */
  function Sort_Menu() {
    $('#sort_btn').on('click', function () {
      $('#sort-background').show();
      $('#sort-menu').animate({
        height: 'show'
      }, 300);
      return false;
    });

    $('#sort-background').click(function () {
      $('#sort-menu').animate({
        height: 'hide'
      }, 300, function () {
        $('#sort-background').hide();
        return false;
      });
    });

    $('#sort-menu').click(function (event) {
      event.stopPropagation();
    });

    $('.sort-menu-list').click(function(event){
      $('#sort-menu').find('.checked').removeClass('checked');
      $(this).addClass('checked');
    });
  }

  /**
   * Control_Slide_List
   * param: none
   */
  function Control_Slide_List() {
    var visible_area = $('.slide-list>li');
    var wide_line = $('.slide-list-line');
    var line_contents = $('.slide-list-line-contents');
    var a_tag = $('.slide-list-line-contents>a');
    var edit_btn = $('.slide-list-edit-btn');

    /*Edit Button Clicked(Page's Header)*/
    edit_btn.on('click', function () {
      if (!($(this).hasClass('editing'))) {
        if (($(this).hasClass('edited'))) {
          $(this).removeClass('edited');
        }
        a_tag.addClass('disabled');
        $(this).addClass('editing');
        visible_area.filter(":last").css('display', 'none');
        line_contents.addClass('edit-ic');
        wide_line.animate({
          'left': '0px'
        }, 500);
      } else if (($(this).hasClass('editing')) && !($(this).hasClass('edited'))) {
        $(this).removeClass('editing');
        $(this).addClass('edited');
        wide_line.animate({
          'left': '-70px'
        }, 500);
        visible_area.filter(":last").css('display', 'block');
        line_contents.removeClass('edit-ic');
        line_contents.removeClass('clear-ic');
        a_tag.removeClass('disabled');
      }
    })

    /*Circle Delete Button Clicked(Page's List Left)*/
    $('.delete-check-btn').on('click', function () {
      $(this).parent().animate({
        'left': '-170px'
      }, 500);
      $(this).next().addClass('clear-ic');
    })

    /*Square Delete Button Clicked(Page's List Right)*/
    $('.line-delete-btn').on('click', function () {
      $(this).closest('li').animate({
        width: 'hide',
        height: 'hide',
        opacity: 'hide'
      }, 'slow', function () {
        $(this).remove();
      });
    });

    /*Deletion When clicking an element being checked*/
    line_contents.on("click", function () {
      if ($(this).hasClass('clear-ic')) {
        if (edit_btn.hasClass('editing')) {
          wide_line.animate({
            'left': '0px'
          }, 500);
          $(this).removeClass('clear-ic');
          a_tag.removeClass('disabled');
        }
      }
    });
  }
});