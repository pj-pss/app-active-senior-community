// function ID currently displayed
var nowViewFunction = "proviedInfoList";
// switch the screen to be displayed
function view(functionId) {
  $("#" + nowViewFunction).addClass('hidden');
  $("#" + functionId).removeClass('hidden');
  nowViewFunction = functionId;

  $('.side-nav').find('.current').removeClass('current');
  $('#menu_' + functionId).addClass('current');
}

// load html
$(function() {
  $("#proviedInfoList").load("proviedInfoList.html");
  $("#operationHistory").load("operationHistory.html");
  $("#disclosureInfotList").load("disclosureInfotList.html" , function(){
    // when select file
    $('#inputFileCsv').on('change', function() {
    // $(document).on('change', ':file', function() {
      var input = $(this),
      // delete file path
      fileName = input.val().replace(/\\/g, '/').replace(/.*\//, '');
      $('#fileNameCsv').html(fileName);

      // show or hide: error message, clear button, upload button
      if(fileName){
        if(fileName.match(/.*\.csv/)){
          showFileFormButton(true, true);
          showFileFormErrorMessage('errorMessageCsv', false);
        }else{
          showFileFormButton(true, false);
          showFileFormErrorMessage('errorMessageCsv', true);
        }
      }else{
        showFileFormButton(false, false);
        showFileFormErrorMessage('errorMessageCsv', false);
      }
    });
  });
  $("#tenantList").load("tenantList.html");
});

function openInfoEdit(id){
  $("#modal-infoEditor").load("infoEditor.html #modal-infoEditor_" + id, null, function(){

    $(function() {
      // set date picker
      $('#datepicker .date').datepicker({
          language: 'ja',
          format: "yyyy/mm/dd (D)",
          autoclose: true,
          todayHighlight: true,
          startDate: Date()
      });

      // click radio button
      $('#modal-infoEditor input[name="articleType"]:radio').on('change', function() {
        var val = $(this).val();
        if(val == "info"){
          $("#modal-infoEditor .date").prop('disabled', true);
          $("#modal-infoEditor .time").prop('disabled', true);
          $("#modal-infoEditor .selectDate .editorItem").removeClass('must');
          $("#modal-infoEditor .venue .editorItem").removeClass('must');
        } else {
          $("#modal-infoEditor .date").prop('disabled', false);
          $("#modal-infoEditor .time").prop('disabled', false);
          $("#modal-infoEditor .selectDate .editorItem").addClass('must');
          $("#modal-infoEditor .venue .editorItem").addClass('must');
        }
      });

      // select upload file
      $('#inputFileImg').on('change', function() {
        var file = $(this).prop('files')[0];
        if(!file) return;

        // show file name
        var input = $(this);
        var fileName = input.val().replace(/\\/g, '/').replace(/.*\//, '');
        $('#fileNameImg').html(fileName);


        // allow only image file
        if (! file.type.match('image.*')) {
          // show error message
          showFileFormErrorMessage('errorMessageImg', true);
          $('#infoThumbnail').html('');
          $('#inputFileImg').val('');
          $('#fileNameImg').html('');
          return;
        }
        showFileFormErrorMessage('errorMessageImg', false);
        $('#clearImgButton')[0].style.display = '';

        // preview
        var reader = new FileReader();
        reader.onload = function() {
          var img_src = $('<img>').attr('src', reader.result).addClass('thumbnail');
          $('#infoThumbnail').html(img_src);
        }
        reader.readAsDataURL(file);
      });
    });

    // If it does not exist, the parent window can not be scrolled.
    $('#modal-preview').on('hidden.bs.modal', function () {
      $('body').addClass('modal-open');
    });

    $('#modal-infoEditor').modal('show');
  });
}

function openComment(id){
  $("#modal-situationAggregate").load("comment.html #modal-situationAggregate_" + id, null, function(){

    $(function() {
      // pop over action
      $("[data-toggle=popover]").popover({
        trigger: 'hover',
        html: true,
      });
    });

    // If it does not exist, the parent window can not be scrolled.
    $('#modal-confirm-delete').on('hidden.bs.modal', function () {
      $('body').addClass('modal-open');
    });

    $('#modal-situationAggregate').modal('show');
  });
}

// load personal data and show modal window
function openEditModal(name) {
  $("#editModal").load("personalData.html #modal-edit_" + name, function(){
    $('#modal-edit_' + name).modal('show');
  });
}

function showConfirm() {
  $('#modal-confirm').modal('show');
}

function submitFile() {
  var fileName = document.getElementById('fileNameCsv').innerHTML;

  $('#modal-loading').modal('show');

  // show loading modal for 3sec
  setTimeout(function(){
    $('#modal-loading').modal('hide');

    // check only file type
    if(fileName.match(/.*\.csv/)){
      $('#modal-success').modal('show');
    }else{
      $('#modal-faild').modal('show');
    }
  },3000);
}

function clearInputFile() {
  showFileFormButton(false, false);
  showFileFormErrorMessage('errorMessageCsv', false);
  $('#inputFileCsv').val('');
  document.getElementById('fileNameCsv').innerHTML = "";
}

function showFileFormButton(clear, upload){
  document.getElementById('clearButton').style.display = clear ? "" : "none";
  document.getElementById('uploadButton').style.display = upload ? "" : "none";
}

function showFileFormErrorMessage(id, errorMessage){
  document.getElementById(id).style.display = errorMessage ? "" : "none";
}

function showDeleteCommentConfirm() {
  $('#modal-confirm-delete').modal('show');
}

function deleteComment(){
  // dummy
  $('#modal-confirm-delete').modal('hide');
}

function showinfoEditorAlert() {
  // If it does not exist, the parent window can not be scrolled.
  $('#modal-infoEditor-alert').on('hidden.bs.modal', function () {
    $('body').addClass('modal-open');
  });

  $('#modal-infoEditor-alert').modal('show');
}

function showInfoPreview() {
  $("#modal-preview").load("infoPreview.html", function(){
    var article = validateArticle();

    if(article.errMsg.length > 0){
      $('#articleError').html('');
      for(i in article.errMsg) {
        $('<li></li>').append(article.errMsg[i]).appendTo('#articleError');
      }
      showinfoEditorAlert();
      return;
    }

    if(article.type == 'event' && article.startDate && article.endDate) {
      var term = article.startDate + ' ' + article.startTime + ' ~ ' + (article.endDate == article.startDate ? '' : article.endDate) + ' ' + article.endTime;
    }

    link = $('<a></a>').attr('href', article.url);
    link.text(article.url);

    var venue = article.venue ? '開催場所: ' + article.venue : '';
    if(!venue) {
      $('#modal-preview .term')[0].style.display = 'none';
    }


    $('#modal-preview .title').html(article.title);
    $('#modal-preview .url').html(link);
    $('#modal-preview .venue').html(venue);
    $('#modal-preview .date').html(term);
    $('#modal-preview .text').html(article.text);
    $('#modal-preview .img').html(article.img);

    jdenticon();

    $('#modal-preview').modal('show');
  });
}

function clearInputImg() {
  showFileFormErrorMessage('errorMessageImg', false);
  $('#infoThumbnail').html('');
  $('#inputFileImg').val('');
  $('#fileNameImg').html('');
  $('#clearImgButton')[0].style.display = 'none';
}

/**
 * validate article input and return input object
 * @return input object and error message list
 */
function validateArticle() {
  var type = $('#modal-infoEditor input[name="articleType"]:checked').val();
  var title = $('#editorTitle').val();
  var startDate = $('#infoStartDate').val();
  var startTime = $('#infoStartTime').val();
  var endDate = $('#infoEndDate').val();
  var endTime = $('#infoEndTime').val();
  var url = $('#editorUrl').val();
  var venue = $('#editorVenue').val();
  var text = $('#editor').val();
  var img = $('#infoThumbnail').html() ||
            $('<canvas>').attr('data-jdenticon-value', title)
            .attr('height', '300').addClass('thumbnail');
  var errMsg = [];

  // required items
  if(!(title && text)) {
    errMsg.push('<span class="must"></span> は必須項目です');
  } else {
    switch (type) {
      case 'info':
        break;

      case 'event':
        if(!(startDate && endDate) || !venue){
          errMsg.push('<span class="must"></span> は必須項目です');
        }

        // check startDate is before endDate
        var start = moment(startDate + startTime);
        var end = moment(endDate + endTime);
        if(start > end) {
          errMsg.push('終了日時は開始日時の後に設定してください');
        }
        break;

      default:
        errMsg.push('終了日時は開始日時の後に設定してください');
        break;
    }
  }

  // check url
  pUrl = $.url(url);
  if(url) {
    if(!(pUrl.attr('protocol').match(/^(https?|ftp)$/) && pUrl.attr('host'))) {
      errMsg.push('正しいURLを入力してください');
    } else {
      var labels = pUrl.attr('host').split('.');
      for(var label of labels){
        if( !label.match(/^([a-zA-Z0-9\-])+$/) || label.match(/(^-)|(-$)/) ) {
          errMsg.push('正しいURLを入力してください');
          break;
        }
      }
    }
  }

  return {
    'type' : type,
    'title' : title,
    'startDate' : startDate,
    'startTime' : startTime,
    'endDate' : endDate,
    'endTime' : endTime,
    'url' : url,
    'venue' : venue,
    'text' : text,
    'img' : img,
    'errMsg' : errMsg
  }
}
