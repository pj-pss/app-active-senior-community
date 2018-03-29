/**
 * Personium
 * Copyright 2017 FUJITSU LIMITED
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
var imageList = {};
var joinList = {};
var sort_key = 'updated';
var filter = null;
var currentTime = moment();
var operationCellUrl = '';

getEngineEndPoint = function () {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};

additionalCallback = function () {
    Common.setIdleTime();
    $.ajax({
        // get current time on japan
        type: 'GET',
        url: 'https://ntp-b1.nict.go.jp/cgi-bin/json'
    })
    .done(function(res) {
        currentTime = moment(res.st * 1000);
        getArticleList();
		actionHistory.logWrite('top');
        getUserProfile();
    });
};

getNamesapces = function () {
    return ['common', 'glossary'];
};

var cs = {};

cs.openSlide = function () {
    $(".overlay").toggleClass('overlay-on');
    $(".slide-menu").toggleClass('slide-on');
};

cs.closeSlide = function () {
    $(".overlay").removeClass('overlay-on');
    $(".slide-menu").removeClass('slide-on');
};

var nowViewMenu = "top";

function view(menuId) {
    if(menuId == "monitoring"){
        $("a.header-text").addClass('collapsed');
        $("div.panel-collapse").removeClass('in');
    }
	$("#" + nowViewMenu).addClass('hidden');
	$("#" + menuId).removeClass('hidden');
    $("#" + menuId).localize();
	nowViewMenu = menuId;
	window.scrollTo(0, 0);
}

function viewProfile(){
    $("#edit-picture").click(function() {
        clearInput(this);
    }).change(function(){
        readURL(this);
    });
	ut.createCropperModal({ dispCircleMaskBool: true });

	$.ajax({
        type: "GET",
		dataType: 'json',
        url : Common.getCellUrl() + '__/profile.json',
        headers: {
            "Accept" : "application/json"
        }
	}).done(function(){
		if(arguments[0].Image.length === 0){
			var cellImgDef = ut.getJdenticon(Common.getCellUrl());
    		$("#editPicturePreview").attr("src", cellImgDef);
		}else{
			$("#editPicturePreview").attr("src", arguments[0].Image);
		}
		$("#nickname").val(arguments[0].DisplayName);
		$("#popupEditDisplayNameErrorMsg").html("<br>");
		$('#profileEdit').actionHistoryShowView();
	});
}

function saveProfile(){
	if(validateDisplayName($("#nickname").val(), "popupEditDisplayNameErrorMsg")){
	    Common.refreshToken(function(){
			$.ajax({
		        type: "GET",
				dataType: 'json',
		        url : Common.getCellUrl() + '__/profile.json',
		        headers: {
		            "Accept" : "application/json"
		        }
			}).done(function(){
				var saveData = _.clone(arguments[0]);
				saveData.DisplayName = $("#nickname").val();
				saveData.Image = $("#editPicturePreview").attr("src");
			    $.ajax({
			        type: "PUT",
			        url: Common.getCellUrl() + '__/profile.json',
			        data: JSON.stringify(saveData),
			        headers: {
			            'Accept': 'application/json',
			            'Authorization': 'Bearer ' + Common.getToken()
			        }
			    }).done(function(){
					$('#monitoring').actionHistoryShowView();
				});
			});
		});
	}
}

editDisplayNameBlurEvent = function() {
	var displayName = $("#nickname").val();
	var displayNameSpan = "popupEditDisplayNameErrorMsg";
	validateDisplayName(displayName, displayNameSpan);
};

function validateDisplayName(displayName, displayNameSpan) {
	var MINLENGTH = 1;
        var lenDisplayName = displayName.length;
        if(lenDisplayName < MINLENGTH || displayName == undefined || displayName == null || displayName == "") {
            $("#" + displayNameSpan).html(i18next.t("pleaseEnterName"));
            return false;
	}

	var MAXLENGTH = 128;
        $("#" + displayNameSpan).html("<br>");
        if (lenDisplayName > MAXLENGTH) {
            $("#" + displayNameSpan).html(i18next.t("errorValidateNameLength"));
            return false;
        }
        return true;
}

function clearInput(input) {
    input.value = null;
}

function readURL(input) {
    if (input.files && input.files[0]) {
        $('#ProfileImageName').val(input.files[0].name);
        var reader = new FileReader();

        reader.onload = function (e) {
            // Set images in cropper modal
            ut.setCropperModalImage(e.target.result);
            // Set functions in cropper modal ok button
            let okFunc = function () {
                let cropImg = ut.getCroppedModalImage();
                $('#editPicturePreview').attr('src', cropImg).fadeIn('slow');
                $("#editPicturePreview").data("attached", true);
            };
            ut.setCropperModalOkBtnFunc(okFunc);

            // Remove focus from input
            document.activeElement.blur();

            // Start cropper modal
            ut.showCropperModal();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

var helpAuthorized = false;
var scanner;

function openQrReader() {
	helpAuthorized = false;
    $('#modal-qrReader').localize();

    var videoComponent = $("#camera-preview");
    var options = {};
    options = initVideoObjectOptions("camera-preview");
    var cameraId = 0;
    initScanner(options);
    initCamera(cameraId);
    scanStart(function (content){
        authorizedQrReader(decryptQR(content));
    });

    $('#modal-qrReader').actionHistoryShowModal();
	$('#modal-qrReader').on('hidden.bs.modal', function () {
	    try{
			scanner.stop();
		}catch(e){}
		$('#modal-qrReader').off('hidden.bs.modal');
	});
}

function openHistory(){
	$("#op-history-list").children().remove();

	var displayHistoryFunc = function(){
		var results = arguments[0].d.results;
		if(results.length === 0){
			return;
		}
		var cells = _.without(_.union(_.pluck(results, 'action_user_cell_url'),_.pluck(results, 'user_cell_url')),null);
		var isSingle = cells.length === 1 ? true : false;
		var list = [];
		_.each(cells, $.proxy(function(cell){
		    list.push($.ajax({
		        type: "GET",
				dataType: 'json',
		        url : cell + '__/profile.json',
		        headers: {
		            "Accept" : "application/json"
		        }
	    	}));
		},this));

		$.when.apply($, list).done($.proxy(function () {
			var arg = arguments;
			if(isSingle){
				arg = {0:arguments};
			}
			var images = {};
			for(var i = 0; i < cells.length; i++){
				images[cells[i]] = arg[i][0].Image !== "" ? arg[i][0].Image : "../img/user-circle.png";
			}
			_.each(results,function(result){
				var img;
				if(result['action_user_cell_url'] !== null){
					img = images[result['action_user_cell_url']];
				}else{
					img = images[result['user_cell_url']];
				}
				var updated = moment(new Date(parseInt(result.__updated.match(/\/Date\((.*)\)\//i)[1],10)));
				$("#op-history-list").append('<div class="col-xs-12 col-md-6 simple_block">' + updated.format("YYYY/MM/DD HH:mm:ss") + '<br><span><img style="border-radius: 50%;" src="' + img + '">' + result.action_detail + '</span></div>');
			});
			$('#opHistory').actionHistoryShowView();
		},this)).fail(function() {
			console.log('error');
		});
	}

	var query = '?\$top=50&\$orderby=__updated desc';
	if(helpAuthorized){
		getExtCellToken(function(){
			getCurrentCellToken(function(ctoken){
				$.ajax({
			        type: "GET",
			        url: operationCellUrl + Common.getBoxName() + '/action/action_history' + query,
		            headers: {
						"Accept" : "application/json",
		                "Authorization": "Bearer " + ctoken
		            }
				}).done(displayHistoryFunc);
			},"");
		},"");
	}else{
	    Common.refreshToken(function(){
			$.ajax({
		        type: "GET",
		        url: Common.getBoxUrl() + 'action/action_history' + query,
	            headers: {
					"Accept" : "application/json",
	                "Authorization": "Bearer " + Common.getToken()
	            }
			}).done(displayHistoryFunc);
		});
	}
}

function openClubHistory() {
    $('#modal-clubHistory').localize();
    $('#modal-clubHistory').actionHistoryShowModal();
}

var qrJson;

function authorizedQrReader(qrJsonStr) {
    try {
        qrJson = JSON.parse(qrJsonStr);
    } catch(e) {
        alert('error: json parse error');
        return;
    }

    if (!validateQRInfo(qrJson)) return;

	operationCellUrl = qrJson.url;
    $.ajax({
        url: operationCellUrl + '__token',
        type: 'POST',
        data: 'grant_type=password&username=' + qrJson.userId + '&password=' + qrJson.password
    })
    .done(function (res) {
        let getExtCellList = function () {
            return $.ajax({
                type: 'GET',
                url: operationCellUrl + '__ctl/ExtCell',
                headers: {
                    'Authorization': 'Bearer ' + res.access_token,
                    'Accept': 'application/json'
                }
            });
        };

        let deleteExtCell = function () {
            return $.ajax({
                type: 'DELETE',
                url: operationCellUrl + "__ctl/ExtCell('" + encodeURIComponent(Common.getCellUrl()) + "')",
                headers: {
                    'Authorization': 'Bearer ' + res.access_token
                }
            });
        };

        let createExtCell = function () {
            return $.ajax({
                type: 'POST',
                url: operationCellUrl + '__ctl/ExtCell',
                headers: {
                    'Authorization': 'Bearer ' + res.access_token
                },
                data: JSON.stringify({
                    'Url': Common.getCellUrl()
                })
            })
                .then(
                    function (res) {
                        return res;
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        alert(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
                        return Promise.reject();
                    }
                );
        };

        let setRole = function () {
            return $.ajax({
                type: 'POST',
                url: operationCellUrl + "__ctl/ExtCell('" + encodeURIComponent(Common.getCellUrl()) + "')/$links/_Role",
                headers: {
                    'Authorization': 'Bearer ' + res.access_token
                },
                data: JSON.stringify({
                    'uri': operationCellUrl + "__ctl/Role(Name='supporter',_Box.Name='" + Common.getBoxName() + "')"
                })
            })
                .then(
                    function (res) {
                        return res;
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        alert(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
                    }
                );
        };

        getExtCellList().done(function (res) {
            let existFlg = false;
            for (let result of res.d.results) {
                if (result.Url == Common.getCellUrl()) {
                    existFlg = true;
                }
            }

            // if ext role is exist, delete and recreate
            if (existFlg) {
                deleteExtCell().then(createExtCell).then(setRole)
                    .done(function () {
                        helpAuthorized = true;
                        $('#editPrflBtn button').prop('disabled', true);
                        getArticleList();
                        getUserProfile();
                        startHelpOp();
                    })
                    .fail(function () {
                        alert('error: help operation');
                    });
            } else {
                createExtCell().then(setRole)
                    .done(function () {
                        helpAuthorized = true;
                        $('#editPrflBtn button').prop('disabled', true);
                        getArticleList();
                        getUserProfile();
                        startHelpOp();
                    })
                    .fail(function () {
                        alert('error: help operation');
                    });
            }
        });

    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        alert(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
    });

    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#modal-qrReader').modal('hide');
    $('#top').actionHistoryShowView();;
}


function openHelpConfirm() {
    $('#modal-helpConfirm').localize();
    $('#modal-helpConfirm').actionHistoryShowModal();
}

function closeHelpConfirm(f) {
    if(f) {
        $.ajax({
            url: operationCellUrl + '__token',
            type: 'POST',
            data: 'grant_type=password&username=' + qrJson.userId + '&password=' + qrJson.password
        }).done(function(res){
            $.ajax({
                type: 'DELETE',
                url: operationCellUrl + "__ctl/ExtCell('" + encodeURIComponent(Common.getCellUrl()) + "')",
                headers: {
                    'Authorization': 'Bearer ' + res.access_token
                }
            })
            .done(function() {
                helpAuthorized = false;
                qrJson = null;
                getArticleList();
                getUserProfile();
                $('#editPrflBtn button').prop('disabled', false);

                $(".endHelpOp").addClass('hidden');
                $(".startHelpOp").removeClass("hidden");
                $('header').css('background-color', '#008F00');
                $('h1').css('background-color', '#008F00');
                $('#during_help').addClass('hidden');
                $('#top').actionHistoryShowView();

            })
            .fail(function() {
                alert('error: delete ext cell');
            });
        })
        .fail(function (XMLHttpRequest, textStatus, errorThrown) {
            alert(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
        });
    }
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#modal-helpConfirm').modal('hide');
}

function startHelpOp() {
    $('#modal-startHelpOp').localize();
    $('#modal-startHelpOp').actionHistoryShowModal();

    $(".startHelpOp").addClass('hidden');
    $(".endHelpOp").removeClass("hidden");

    $('header').css('background-color', '#FF0000');
    $('h1').css('background-color', '#FF0000');

    $("#during_help").removeClass("hidden");
}

function viewInfoDisclosureDetail(type){
    $("#modal-inforDisclosureHistory .title_text").attr("data-i18n", "profile." + type);
    $('#modal-inforDisclosureHistory').localize();
    $('#modal-inforDisclosureHistory').actionHistoryShowModal();
}
function openInforDisclosureHistoryPer(type) {
    $("#modal-inforDisclosureHistoryPer .title_text").html(type);
    $('#modal-inforDisclosureHistoryPer').localize();
    $('#modal-inforDisclosureHistoryPer').actionHistoryShowModal();
}

function openSendReplyModal(reply, articleId, userReplyId, orgReplyId, sameReply) {
    var arg = reply + ",'" + articleId + "'";
    if(userReplyId && orgReplyId) {
        arg += ", '" + userReplyId + "', '" + orgReplyId + "'";
    }
    arg += "," + sameReply;

    $('#sendReplyButton').attr('onclick', 'replyEvent(' + arg + ')');

	var title;
	if(reply === REPLY.JOIN){
		title = "msg.join";
	}else{
		title = "msg.consider";
	}
    $('#modal-sendReply').actionHistoryShowModal({detail : i18next.t(title)});
}

// load html
$(function() {
    $("#top").load("top.html", function() {
        $('#filterInfo').attr('onclick','setFilter(' + TYPE.INFO + ')');
        $('#filterEvent').attr('onclick', 'setFilter(' + TYPE.EVENT + ')');
    });
    $("#monitoring").load("monitoring.html", function () {
        $("#myhealth").load("myhealth.html", function() {
            var topBtn = $('.scrollToTop');
            topBtn.hide();
            $(window).scroll(function () {
                if ($(this).scrollTop() > 100) {
                    topBtn.fadeIn();
                } else {
                    topBtn.fadeOut();
                }
            });
            topBtn.click(function () {
                $('body,html').animate({
                    scrollTop: 0
                }, 500);
                return false;
            });

            // prevent the propagation of events to the parent element (prevent to open the accordion)
            $(".list-group-item .watching").on("click", function(e) {
                e.stopPropagation();
            });
        });
    });
    $("#profileEdit").load("profileEdit.html");
    $("#opHistory").load("opHistory.html");
    $("#articleDetail").load("articleDetail.html");
    $("#entryList").load("entryList.html");
    $("#modal-qrReader").load("modal-qrReader.html");
    $("#modal-helpConfirm").load("modal-helpConfirm.html");

    $("#modal-startHelpOp").load("modal-startHelpOp.html");
    $("#modal-sendReply").load("modal-sendReply.html");

    $('#dvOverlay').on('click', function() {
        $(".overlay").removeClass('overlay-on');
        $(".slide-menu").removeClass('slide-on');
    });

    $("#profileBasic").collapse('hide');

});

function getArticleList() {
    getExtCellToken(function (token){
        var oData = 'article';
        var entityType = 'provide_information';

        var now = String(new Date().getTime());

        $.ajax({
            type: "GET",
            url: Common.getToCellBoxUrl() + oData + '/' + entityType + '?\$filter=end_date gt \'' + now + '\' or type eq ' + TYPE.INFO + '&\$orderby=__updated desc',
            headers: {
                "Authorization": "Bearer " + token,
                "Accept" : "application/json"
            },
            data: {
                '\$top': GET_NUM
            }
        }).done(function(data) {
			setArticle(data.d.results, token);
            getJoinInfoList(token);
        })
        .fail(function() {
            alert('failed to get article list');
        });
    });
}

function getArticleListImage(id, token) {
    var DAV = 'article_image';

    $.ajax({
        type: 'GET',
        url: Common.getToCellBoxUrl() + DAV + '/' + id,
        dataType: 'binary',
        processData: false,
        responseType: 'blob',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .done(function(res) {
        var reader = new FileReader();
        reader.onloadend = $.proxy(function (event) {
            var binary = '';
            var bytes = new Uint8Array(event.currentTarget.result);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            window.btoa(binary);
            image =  "data:image/jpg;base64," + btoa(binary);
            $('#' + id).css('background-image', "url('" + image + "')");
            imageList[id] = image;
        }, this);
        reader.readAsArrayBuffer(res);
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        alert(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
    });
}

function getJoinInfoList(token) {
    // get reply list
    var oData = 'reply';
    var entityType = 'reply_history';

    $.ajax({
        type: "GET",
        url: Common.getToCellBoxUrl() + oData + '/' + entityType,
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        },
        data: {
            '\$top': GET_NUM
        }
    })
    .done(function(res) {
        // set num
        var count = {};
        for (let val of res.d.results) {
            if($('#join_' + val.provide_id)[0]) {
                if(count[val.provide_id] == null) {
                    count[val.provide_id] = {};
                    count[val.provide_id].join = 0;
                    count[val.provide_id].consider = 0;
                }

                switch(parseInt(val.entry_flag)) {
                    case REPLY.JOIN: count[val.provide_id].join++; break;
                    case REPLY.CONSIDER: count[val.provide_id].consider++; break;
                    default: alert('error: get reply information');
                }

            }
        }
        for (let key in count) {
            var joinHtml = '<i class="fa fa-fw fa-thumbs-up" aria-hidden="true"></i>: '
                + count[key].join
                + '<i class="fa fa-fw fa-check-square-o" aria-hidden="true"></i>: '
                + count[key].consider;
            joinList[key] = joinHtml;
            $('#join_' + key).html(joinHtml);
        }
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        alert(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
    });
}

function viewJoinConsiderList(entryFlag,articleId){
    getExtCellToken(function (token,arg) {
	    var oData = 'reply';
	    var entityType = 'reply_history';

	    $.ajax({
	        type: "GET",
	        url: Common.getToCellBoxUrl() + oData + '/' + entityType + '?\$filter=entry_flag eq ' + arg[0] + ' and provide_id eq \'' + arg[1] + '\'&\$orderby=__updated desc',
	        headers: {
	            "Authorization": "Bearer " + token,
	            "Accept": "application/json"
            },
            data: {
                '\$top': GET_NUM
            }
	    })
	    .done(function(res) {
			var list = [];
			this.entryDatas = res.d.results;
			_.each(this.entryDatas, $.proxy(function(entryData){
			    list.push($.ajax({
			        type: "GET",
					dataType: 'json',
			        url : entryData.user_cell_url + '__/profile.json',
			        headers: {
			            "Authorization": "Bearer " + token,
			            "Accept" : "application/json"
			        }
		    	}));
			},this));

			this.multi = list.length !== 1 ? true : false;
			$.when.apply($, list).done($.proxy(function () {
				var profiles = arguments;
				if(!this.multi){
					profiles = {0:arguments};
				}
				$("#entry-list table").children().remove();
				var title;
				if(arg[0] === REPLY.JOIN){
					title = "pageTitle.participate";
					$("#entry-list-title").attr("data-i18n", "pageTitle.participate");
				}else{
					title = "pageTitle.consider";
					$("#entry-list-title").attr("data-i18n", "pageTitle.consider");
				}

				$("#entry-list-count").text(this.entryDatas.length.toString());

				for(var i = 0; i < this.entryDatas.length; i++){
					var updated = moment(new Date(parseInt(this.entryDatas[i].__updated.match(/\/Date\((.*)\)\//i)[1],10)));
					var dispname = '<td data-i18n=\"entry.anonymous\"></td>';
					var dispdescription = "";
					var	imgsrc = "../img/user-circle.png";
					if(!this.entryDatas[i].anonymous){
						dispname = '<td>' + profiles[i][0].DisplayName + '</td>';
						dispdescription = profiles[i][0].Description;
						if(profiles[i][0].Image !== ""){
							imgsrc = profiles[i][0].Image;
						}
					}

					var img = '<img class=\"image-circle-large\" src=\"' + imgsrc + '\" alt=\"image\"></img>';
					var elem = '<tr><td rowspan="3" class="td-bd">' + img + '</td>' + dispname + '<td rowspan="3" class="td-bd"><i class="fa fa-fw fa-angle-right icon" aria-hidden="true"></i></td></tr><tr><td>' + dispdescription + '</td></tr><tr><td class="td-bd">' + updated.format("YYYY/MM/DD") + '</td></tr>';

					$("#entry-list table").append(elem);
				}

				$('#entryList').actionHistoryShowView({detail : i18next.t(title)});

			},this)).fail(function() {
				console.log('error: get profile.json');
			});
	    })
	    .fail(function() {
	        alert('error: get reply_history');
	    });

    }, [entryFlag,articleId]);
}

function getArticleDetail(id) {

    getExtCellToken(function (token) {
        var oData = 'article';
        var entityType = 'provide_information';
        var DAV = 'article_image';

        var err = [];

        $.when(
            // get text
            $.ajax({
                type: 'GET',
                url: Common.getToCellBoxUrl() + oData + '/' + entityType + "('" + id + "')",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                success: function (res) {
                    return res;
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
                }
            }),

            // get image
            $.ajax({
                type: 'GET',
                url: Common.getToCellBoxUrl() + DAV + '/' + id,
                dataType: 'binary',
                processData: false,
                responseType: 'blob',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function (res) {
                    return res;
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
                }
            }),

            // get reply info
            $.ajax({
                type: 'GET',
                url: Common.getToCellBoxUrl() + "reply/reply_history",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                data: {
                    "\$filter": "provide_id eq '" + id + "'",
                    '\$top': GET_NUM
                },
                success: function (res) {
                    return res;
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
                }
            })
        )
        .done(function (text, image, reply) {
            // construct text
            var article = text[0].d.results;

            var term = '';
            if (article.type == TYPE.EVENT && article.start_date && article.end_date) {
                var startTime = new Date(Math.floor(article.start_date));
                var endTime = new Date(Math.floor(article.end_date));
                var startDisplayDate = moment(startTime).format("YYYY/MM/DD");
                var endDisplayDate = moment(endTime).format("YYYY/MM/DD");
                var startDisplayDayOfTheWeek = i18next.t("dayOfTheWeek." + moment(startTime).format("ddd"));
                var endDisplayDayOfTheWeek = i18next.t("dayOfTheWeek." + moment(endTime).format("ddd"));
                var startDisplayTime = moment(startTime).format("HH:mm");
                var endDisplayTime = moment(endTime).format("HH:mm");

                term = startDisplayDate + " (" + startDisplayDayOfTheWeek + ") " + startDisplayTime + ' ~ ' + (endDisplayDate == startDisplayDate ? '' : endDisplayDate + " (" + endDisplayDayOfTheWeek + ")") + ' ' + endDisplayTime;
                $('#replyContainer').css('display', '');
            } else {
                $('#replyContainer').css('display', 'none');
            }

            link = $('<a></a>').attr('href', article.url);
            link.text(article.url);

            var venue = article.venue ? i18next.t('articleItem.venue') + ': ' + article.venue : '';
            $('#articleDetail .term')[0].style.display = venue ? '' : 'none';

            var img = $('<img>').attr('src', article.previewImg).addClass('thumbnail');

            $('#articleDetail .title').html(article.title);
            $('#articleDetail .url').html(link);
            $('#articleDetail .venue').html(venue);
            $('#articleDetail .date').html(term);
            $('#articleDetail .text').html(article.detail);

            // show image
            var reader = new FileReader();
            reader.onloadend = $.proxy(function (event) {
                var binary = '';
                var bytes = new Uint8Array(event.currentTarget.result);
                var len = bytes.byteLength;
                for (var i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                window.btoa(binary);
                getImage = "data:image/jpg;base64," + btoa(binary);
                var img_src = $('<img>').attr('src', getImage).addClass('thumbnail');
                $('#articleDetail .img').html(img_src);
            }, this);
            reader.readAsArrayBuffer(image[0]);

            $('#articleDetail .entry')[0].style.display = article.type == TYPE.EVENT ? '' : 'none';
            if (article.type == TYPE.EVENT) {
                var replys = reply[0].d.results;
                var join = 0, consider = 0;
                for(reply of replys) {
                    switch(reply.entry_flag){
                        case REPLY.JOIN: join++; break;
                        case REPLY.CONSIDER: consider++; break;
                    }
                }
                $('#joinNum').html(join);
                $('#considerNum').html(consider);
                $('#join-link').attr('onclick', "javascript:viewJoinConsiderList(" + REPLY.JOIN + ", '" + article.__id + "');return false;");
                $('#consider-link').attr('onclick', "javascript:viewJoinConsiderList(" + REPLY.CONSIDER + ", '" + article.__id  + "');return false;");
                // get reply information
                getCurrentCellToken(function(currentToken){
                    let boxUrl = helpAuthorized ? operationCellUrl + Common.getBoxName() + '/' : Common.getBoxUrl();
                    let cellUrl = helpAuthorized ? operationCellUrl : Common.getCellUrl();
                    $.when(
                        $.ajax({
                            type: 'GET',
                            url: boxUrl + "reply/reply_history",
                            headers: {
                                "Authorization": "Bearer " + currentToken,
                                "Accept": "application/json"
                            },
                            data: {
                                "\$filter": "provide_id eq '" + article.__id + "'",
                                '\$top': GET_NUM
                            }
                        }),
                        $.ajax({
                            type: 'GET',
                            url: Common.getToCellBoxUrl() + "reply/reply_history",
                            headers: {
                                "Authorization": "Bearer " + token,
                                "Accept": "application/json"
                            },
                            data: {
                                "\$filter": "provide_id eq '" + article.__id + "' and user_cell_url eq '" + cellUrl + "'",
                                '\$top': GET_NUM
                            }
                        })
                    )
                    .done(function(res1, res2) {
                        var userCell = res1[0].d ? res1[0].d.results[0] : null;
                        var orgCell = res2[0].d ? res2[0].d.results[0] : null;
                        if (userCell && orgCell){
                            updateReplyLink(userCell.entry_flag, article.__id, userCell.__id, orgCell.__id);
                        } else {
                            $('#joinEvent').attr('href', "javascript:openSendReplyModal(" + REPLY.JOIN + ", '" + article.__id + "')");
                            $('#considerEvent').attr('href', "javascript:openSendReplyModal(" + REPLY.CONSIDER + ", '" + article.__id + "')");
                        }
                    })
                    .fail(function() {
                        alert('error: get reply information');
                    });
                });
            }

            $('#articleDetail').actionHistoryShowView();

        })
        .fail(function () {
            alert('failed to get article detail\n\n' + err.join('\n'));
        });
    }, id);
}

/**
 * Get token for organization cell and callback argument function.
 * @param {function} callback
 * @param {string} id :article/userReply/etc... (for callback function)
 */
function getExtCellToken(callback, id) {
    if (Common.getCellUrl() == ORGANIZATION_CELL_URL) {
        callback(Common.getToken(), id);
    } else {
        if(helpAuthorized) {
            $.when(Common.getTranscellToken(operationCellUrl), Common.getAppAuthToken(operationCellUrl))
                .done(function (result1, result2) {
                    let tempTCAT = result1[0].access_token; // Transcell Access Token
                    let tempAAAT = result2[0].access_token; // App Authentication Access Token
                    Common.getProtectedBoxAccessToken4ExtCell(operationCellUrl, tempTCAT, tempAAAT).done(function (appCellToken) {
                        $.when(Common.getTranscellToken(ORGANIZATION_CELL_URL), Common.getAppAuthToken(ORGANIZATION_CELL_URL))
                            .done(function (result11, result12) {
                                let tempTCAT2 = result11[0].access_token; // Transcell Access Token
                                let tempAAAT2 = result12[0].access_token; // App Authentication Access Token
                                Common.getProtectedBoxAccessToken4ExtCell(ORGANIZATION_CELL_URL, tempTCAT2, tempAAAT2).done(function (appCellToken2) {
                                    callback(appCellToken2.access_token, id);
                                }).fail(function (error) {
                                    alert("error: get org cell token");
                                });
                            })
                            .fail(function (error) {
                                alert("error: get trance cell token");
                            });
                    }).fail(function (error) {
                        alert("error: get ext cell token");
                    });
                })
                .fail(function () {
                    alert("error: get ext cell token");
                });
        } else {
            $.when(Common.getTranscellToken(ORGANIZATION_CELL_URL), Common.getAppAuthToken(ORGANIZATION_CELL_URL))
                .done(function (result1, result2) {
                    let tempTCAT = result1[0].access_token; // Transcell Access Token
                    let tempAAAT = result2[0].access_token; // App Authentication Access Token
                    Common.perpareToCellInfo(ORGANIZATION_CELL_URL, tempTCAT, tempAAAT, function (cellUrl, boxUrl, token) {
                        callback(token, id);
                    });
                })
                .fail(function () {
                    alert('failed to get token');
                });
        }
    }
}

function getCurrentCellToken(callback, id) {
    if(helpAuthorized) {
        $.when(Common.getTranscellToken(operationCellUrl), Common.getAppAuthToken(operationCellUrl))
            .done(function (result1, result2) {
                let tempTCAT = result1[0].access_token; // Transcell Access Token
                let tempAAAT = result2[0].access_token; // App Authentication Access Token
                 Common.getProtectedBoxAccessToken4ExtCell(operationCellUrl, tempTCAT, tempAAAT).done(function (appCellToken) {
                    callback(appCellToken.access_token, id);
                }).fail(function (error) {
                    alert("error: get ext cell access token");
                });
            })
            .fail(function () {
                alert("error: get trance cell token");
            });
    } else {
        callback(Common.getToken(), id);
    }
}

/**
 * Send the reply to user cell and organization cell.
 * @param {int} reply :REPLY.JOIN or REPLY.CONSIDER
 * @param {string} articleId
 * @param {string} userReplyId :if id is exist, this func's role is the update
 * @param {string} orgReplyId
 * @param {bool} sameReply :same entry flag already sanded
 */
function replyEvent(reply, articleId, userReplyId, orgReplyId, sameReply) {
    var oData = 'reply';
    var entityType = 'reply_history';

    getExtCellToken(function(token) {
        var err = [];
        var anonymous = $('[name=checkAnonymous]').prop('checked');
        var boxUrl = helpAuthorized ? operationCellUrl + Common.getBoxName() + '/' : Common.getBoxUrl();
        var userCellUrl = helpAuthorized ? operationCellUrl : Common.getCellUrl();

        getCurrentCellToken(function(currentToken) {
            var saveToUserCell = function(){
                var method = 'POST';
                var url = boxUrl + oData + '/' + entityType;
                if(userReplyId) {
                    method = 'PUT';
                    url += "('" + userReplyId + "')";
                }

                return $.ajax({
                    type: method,
                    url: url,
                    headers: {
                        "Authorization": "Bearer " + currentToken
                    },
                    data: JSON.stringify({
                        // 'update_user_id'
                        'user_cell_url': userCellUrl, // dummy ID
                        'provide_id': articleId,
                        'entry_flag': reply,
                        'anonymous': anonymous
                    })
                })
                .then(
                    function(res) {
                        return userReplyId || res;
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
                    }
                );
            };

            var saveToOrganizationCell = function(res) {
                var id = res.d ? res.d.results.__id : res;

                var method = 'POST';
                var url = Common.getToCellBoxUrl() + oData + '/' + entityType;
                if (orgReplyId) {
                    method = 'PUT';
                    url += "('" + orgReplyId + "')";
                }

                return $.ajax({
                    type: method,
                    url: url,
                    headers: {
                        "Authorization": "Bearer " +  token
                    },
                    data: JSON.stringify({
                        // 'update_user_id'
                        'user_cell_url': userCellUrl,
                        'provide_id': articleId,
                        'entry_flag': reply,
                        'user_reply_id': id,
                        'anonymous': anonymous
                    })
                })
                .then(
                    function (res) {
                        return res;
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);

                        // delete/change the reply on user cell
                        if(!userReplyId){
                            $.ajax({
                                type: 'DELETE',
                                url: boxUrl + oData + '/' + entityType + "('" + id + "')",
                                headers: {
                                    'Authorization': 'Bearer ' + currentToken
                                }
                            })
                            .fail(function (XMLHttpRequest, textStatus, errorThrown) {
                                alert('delete failed');
                            })
                            .done(function() {
                                alert('delete done');
                            });
                        } else {
                            $.ajax({
                                type: 'PUT',
                                url: boxUrl + oData + '/' + entityType + "('" + id + "')",
                                headers: {
                                    'Authorization': 'Bearer ' + currentToken
                                },
                                data: JSON.stringify({
                                    // 'update_user_id'
                                    'provide_id': articleId,
                                    'entry_flag': reply == REPLY.JOIN ? REPLY.CONSIDER : REPLY.JOIN
                                })
                            })
                                .fail(function (XMLHttpRequest, textStatus, errorThrown) {
                                    alert('change failed');
                                })
                                .done(function () {
                                    alert('change done');
                                });
                        }

                        return Promise.reject();
                    }
                );
            };

            saveToUserCell().then(saveToOrganizationCell)
            .fail(function(){
                alert('faild to send reply\n' + err.join('\n'));
            })
            .done(function(res) {
                var userId = userReplyId || res.d.results.user_reply_id;
                var orgId = orgReplyId || res.d.results.__id;
                alert('done');
                updateReplyLink(reply, articleId, userId, orgId);

                var join = $('#joinNum').html();
                var consider = $('#considerNum').html();
                if (reply == REPLY.JOIN) {
                    if (!userReplyId) {
                        join++;
                    } else if (!sameReply) {
                        join++;
                        consider--;
                    }
                } else {
                    if (!userReplyId) {
                        consider++;
                    } else if (!sameReply) {
                        consider++;
                        join--;
                    }
                }
                $('#joinNum').html(join);
                $('#considerNum').html(consider);
            });
        });
    }, userReplyId);
}

/**
 * Update link for sending the reply.
 * @param {int} reply :Sended users reply type ( REPLY.JOIN or REPLY.CONSIDER )
 * @param {string} articleId
 * @param {string} userReplyId
 * @param {string} orgReplyId
 */
function updateReplyLink(reply, articleId, userReplyId, orgReplyId){
    var argJoin = '';
    var argConsider = '';
    switch (reply) {
        case REPLY.JOIN:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', true";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', false";
            break;

        case REPLY.CONSIDER:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', false";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', true";
            break;

        default:
            // data is not exist
            alert('error: read reply information');
            break;
    }

    $('#joinEvent').attr('href', "javascript:openSendReplyModal(" + argJoin + ")");
    $('#considerEvent').attr('href', "javascript:openSendReplyModal(" + argConsider + ")");
}

function setArticle(articleList, token){

    $('#topEvent').children().remove();
    for(let article of articleList){
        getArticleListImage(article.__id, token);
        $('#topEvent').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
    }

    $.each(imageList, function(key, value) {
        $('#' + key).css('background-image', "url('" + value + "')");
    });

    $.each(joinList, function(key, value) {
        if ($('#join_' + key)[0]){
            $('#join_' + key).html(value);
        }
    });

    addLinkToGrid();
}

function sortArticle(){
	alert("Function to be deleted.");
}

function setFilter(key){
	$(".display" + String(key)).show();
	if(key === TYPE.INFO){
		$(".display" + String(TYPE.EVENT)).hide();
	}else{
		$(".display" + String(TYPE.INFO)).hide();
	}
}

function clearFilter(){
	$('#topEvent').children().show();
}

function createArticleGrid(id, title, date, type){
    date = date || "";
    var dispDate;
    if(date){
        var startDate = new Date(Math.floor(date));
        dispDate = moment(startDate).format("YYYY/MM/DD") + " (" + i18next.t("dayOfTheWeek." + moment(startDate).format("ddd")) + ")";
    }else{
        dispDate = "";
    }

    var div = '<div class=\'display' + String(type) + '\' data-href="javascript:getArticleDetail(\'' + id + '\')">';
    div += '<div class="col-xs-4 col-md-2 block_img">'
        + '<span id="' + id + '" class="cover"></span>'
        + '</div>';
    div += '<div class="col-xs-8 col-md-4 block_description">'
        + '<table class="stealth_table">'
        + '<tr class="date"><td>' + dispDate + '</td></tr>'
        + '<tr class="title"><td>' + title + '</td></tr>';

    // article type is event
    if(date != ""){
        div += '<tr class="join"><td id="join_' + id + '"><i class="fa fa-fw fa-thumbs-up" aria-hidden="true"></i>:0 <i class="fa fa-fw fa-check-square-o" aria-hidden="true"></i>:0</td></tr>';
    }

    div += '</table></div></div>';

    return div;
}

function addLinkToGrid() {
    $('div[data-href]').addClass('clickable').click(function () {
        window.location = $(this).attr('data-href');
    }).find('a').hover(function () {
        $(this).parents('div').unbind('click');
    }, function () {
        $(this).parents('div').click(function () {
            window.location = $(this).attr('data-href');
        });
    });
}

function getUserProfile() {
    getCurrentCellToken(function(token){
        let boxUrl = helpAuthorized ? operationCellUrl + Common.getBoxName() + '/' : Common.getBoxUrl();
        let cellUrl = helpAuthorized ? operationCellUrl : Common.getCellUrl();
        $.when(
            $.ajax({
                type: 'GET',
                url: boxUrl + "user_info/user_basic_information",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            }),
            $.ajax({
                type: 'GET',
                url: boxUrl + "user_info/user_health_information",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            }),
            $.ajax({
                type: 'GET',
                url: boxUrl + "user_info/user_vital",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            }),
            $.ajax({
                type: 'GET',
                url: boxUrl + "user_info/user_household",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            }),
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: cellUrl + '__/profile.json',
                headers: {
                    "Accept": "application/json"
                }
            }),
            $.ajax({
                type: "GET",
                url: boxUrl + 'user_info/user_evacuation',
                headers: {
                    "Authorization": "Bearer " + token,
                    "Accept": "application/json"
                }
            })
        )
        .done(function(res1, res2, res3, res4, res5, res6){
            vitalList = _.sortBy(res3[0].d.results, function(item){return item.__updated;});
            vitalList.reverse();

            var basicInfo = res1[0].d.results[0];
            var healthInfo = res2[0].d.results[0];
            var household = res4[0].d.results[0];
            var profileJson = res5[0];
            var evacuation = res6[0].d.results[0];
            var vital = vitalList[0];
            var preVital = vitalList[1];

            var tempDiff;
            var minDiff;
            var maxDiff;
            var pulseDiff;
            if(preVital != null) {
                tempDiff = Math.round((vital.temperature - preVital.temperature) * 10)/10;
                minDiff = vital.min_pressure - preVital.min_pressure;
                maxDiff = vital.max_pressure - preVital.max_pressure;
                pulseDiff = vital.pulse - preVital.pulse;

                tempDiff = tempDiff < 0 ? tempDiff : '+' + tempDiff;
                minDiff = minDiff < 0 ? minDiff : '+' + minDiff;
                maxDiff = maxDiff < 0 ? maxDiff : '+' + maxDiff;
                pulseDiff = pulseDiff < 0 ? pulseDiff : '+' + pulseDiff;
            }

            var sex;
            switch(basicInfo.sex) {
                case 'male': sex = i18next.t('sex.male'); break;
                case 'female': sex = i18next.t('sex.female'); break;
                default: sex = i18next.t('sex.other');
            }

            var basicInfoHtml = '';
            if(basicInfo) {
                basicInfoHtml = '<dt>' +
                    '<dt>' + i18next.t('basicInfo.name') + ':</dt>' +
                    '<dd>' + basicInfo.name + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.howToRead') + ':</dt>' +
                    '<dd>' + basicInfo.name_kana + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.sex') + ':</dt>' +
                    '<dd>' + sex + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.birthday') + ' (' + i18next.t('basicInfo.age') + '):</dt>' +
                    '<dd>' + basicInfo.birthday + ' (' + currentTime.diff(moment(basicInfo.birthday), 'years') + ')</dd>' +
                    '<dt>' + i18next.t('basicInfo.postalCode') + ':</dt>' +
                    '<dd>' + basicInfo.postal_code + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.address') + ':</dt>' +
                    '<dd>' + basicInfo.address + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.comment') + ':</dt>' +
                    '<dd>' + basicInfo.comment + '</dd>' +
                    '</dt>';
            }
            $('#basicInfo').html(basicInfoHtml);

            var healthInfoHtml = '';
            if(healthInfo) {
                healthInfoHtml = '<dt>' +
                    '<dt>' + i18next.t('health.height') + ':</dt>' +
                    '<dd>' + healthInfo.height + ' cm</dd>' +
                    '<dt>' + i18next.t('health.weight') + ':</dt>' +
                    '<dd>' + healthInfo.weight + ' kg</dd>' +
                    '<dt>BMI:</dt>' +
                    '<dd>' + healthInfo.bmi + '</dd>' +
                    '<dt>' + i18next.t('health.girthAbdomen') + ':</dt>' +
                    '<dd>' + healthInfo.grith_abdomen + ' cm</dd>' +
                    '</dt>';
            }
            $('#healthInfo').html(healthInfoHtml);

            var vitalHtml = '';
            if(vital) {
                vitalHtml = '<dt>' +
                    '<dt>' + i18next.t('vital.bodyTemp') + ':</dt>' +
                    '<dd>' + vital.temperature + ' &deg;C (' + (tempDiff || '-') + ')' + '</dd>' +
                    '<dt>' + i18next.t('vital.bloodPressure') + ':</dt>' +
                    '<dd>' + i18next.t('vital.max') + ': ' + vital.max_pressure + ' mmHg' + ' (' + (maxDiff || '-') + ')' + '</dd>' +
                    '<dd>' + i18next.t('vital.min') + ': ' + vital.min_pressure + ' mmHg' + ' (' + (minDiff || '-') + ')' + '</dd>' +
                    '<dt>' + i18next.t('vital.pulse') + ':</dt>' +
                    '<dd>' + vital.pulse + ' bpm' + ' (' + (pulseDiff || '-') + ')' +  '</dd>' +
                    '</dt>';
            }
            $('#vital').html(vitalHtml);

            var profile =
                '<tr><th>' + i18next.t('basicInfo.name') + ':</th><td>' + basicInfo.name + '<br>(' + basicInfo.name_kana + ')</td></tr>' +
                '<tr><th>' + i18next.t('basicInfo.birthday') + ':</th><td>' + basicInfo.birthday + '<br>(' + currentTime.diff(moment(basicInfo.birthday), 'years') + ')</td></tr>' +
                '<tr><th>' + i18next.t('basicInfo.sex') + ':</th><td>' + basicInfo.name + '</td></tr>' +
                // '<tr><th>' + i18next.t('basicInfo.bloodType') + ':</th><td>' + basicInfo.bloodType + '</td></tr>' +
                '<tr><th>' + i18next.t('basicInfo.address') + ':</th><td>' + basicInfo.address + '</td></tr>' +
                '<tr><th>' + i18next.t('basicInfo.residentType') + ':</th><td>' + household.resident_type + '</td></tr>';
            $('#userProfile').html(profile);

            if(profileJson.Image.length == 0) {
                var cellImgDef = ut.getJdenticon(Common.getCellUrl());
                $("#monitoring .profileImg").attr("src", cellImgDef);
            } else {
                $("#monitoring .profileImg").attr("src", profileJson.Image);
            }

            $('#monitoring .nickname').html(profileJson.DisplayName);

            let location = evacuation.not_at_home ? i18next.t('locationState.outdoor') : i18next.t('locationState.indoor');
            $('#monitoring .nowLocation').html(location);

            $('#modal-helpConfirm .userName').html(basicInfo.name);
            $('#modal-startHelpOp .userName').html(basicInfo.name);

        })
        .fail(function() {
            alert('error: get user profile');
        });
    });

}

/**
 * decrypt read from QRcode to ID,pass,cellUrl
 * @param {String} content :encrypted information
 */
function decryptQR(content) {
    var array_rawData = content.split(',');

    var salt = CryptoJS.enc.Hex.parse(array_rawData[0]);  // passwordSalt
    var iv = CryptoJS.enc.Hex.parse(array_rawData[1]);    // initialization vector
    var encrypted_data = CryptoJS.enc.Base64.parse(array_rawData[2]);

    // password (define key)
    var secret_passphrase = CryptoJS.enc.Utf8.parse(Common.getBoxName());
    var key128Bits500Iterations =
        CryptoJS.PBKDF2(secret_passphrase, salt, { keySize: 128 / 8, iterations: 500 });

    // decrypt option (same of encrypt)
    var options = { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };

    // decrypt
    var decrypted = CryptoJS.AES.decrypt({ "ciphertext": encrypted_data }, key128Bits500Iterations, options);
    // convert to UTF8
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function validateQRInfo(qrJson) {
    if ('userId' in qrJson && 'password' in qrJson && 'url' in qrJson) {
        let id = qrJson.userId;

        let pass = qrJson.password;
        if (MIN_PASS_LENGTH >= pass.length || pass.length >= MAX_PASS_LENGTH ||
            !pass.match(/^([a-zA-Z0-9\-\_])+$/)) {
                alert('error: invalid password');
            return false;
        }

        let pUrl = $.url(qrJson.url);
        if (!(pUrl.attr('protocol').match(/^(https)$/) && pUrl.attr('host'))) {
            alert('error: invalid url');
            return false;
        } else {
            let labels = pUrl.attr('host').split('.');
            for (let label of labels) {
                if (!label.match(/^([a-zA-Z0-9\-])+$/) || label.match(/(^-)|(-$)/)) {
                    alert('error: invalid url');
                    return false;
                }
            }

            if (pUrl.attr('source') == Common.getCellUrl()) {
                alert('error: own user cell');
                return false;
            }
        }

        return true;
    }

    alert('error: invalid QRcode data');
    return false;
}
