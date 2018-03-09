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
var articleList = [];
var imageList = {};
var joinList = {};
var sort_key = 'updated';
var filter = null;
var currentTime = moment();
var opUrl = '';
var preCellUrl = '';
var preAppCellToken = null;

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
        getArticleList('topEvent');
        getUserProfile();
    })
}

getNamesapces = function () {
    return ['common', 'glossary'];
};

var cs = {};

cs.openSlide = function () {
    $(".overlay").toggleClass('overlay-on');
    $(".slide-menu").toggleClass('slide-on');
}

cs.closeSlide = function () {
    $(".overlay").removeClass('overlay-on');
    $(".slide-menu").removeClass('slide-on');
}

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
		$("#popupEditDisplayNameErrorMsg").html("");
		view('profileEdit');
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
					view('monitoring');
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
        $("#" + displayNameSpan).html("");
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
                $("#editPicturePreview").data("attached", true)
            }
            ut.setCropperModalOkBtnFunc(okFunc);

            // Remove focus from input
            document.activeElement.blur()

            // Start cropper modal
            ut.showCropperModal();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

var helpAuthorized = false;

function openNfcReader() {
	helpAuthorized = false;
    $('#modal-nfcReader').localize();
    $('#modal-nfcReader').modal('show');
}

function openPersonalInfo() {
    $('#modal-personalInfo').localize();
    $('#modal-personalInfo').modal('show');
}

function openPersonalInfo2() {
    $('#modal-personalInfo2').localize();
    $('#modal-personalInfo2').modal('show');
}

function openPersonalInfo3() {
    $('#modal-personalInfo3').localize();
    $('#modal-personalInfo3').modal('show');
}
function openClubHistory() {
    $('#modal-clubHistory').localize();
    $('#modal-clubHistory').modal('show');
}

function authorizedNfcReader() {
    let cellUrl = Common.getCellUrl();
    Common.getAppAuthToken(cellUrl).done(function (appToken) {
        Common.getProtectedBoxAccessToken(appToken.access_token, cellUrl).done(function (appCellToken) {
            // get current appCellToken
            preAppCellToken = appCellToken;
            preCellUrl = Common.getCellUrl();

            // get supported user token
            opUrl = $('#nfcUrl').val();
            $.ajax({
                url: opUrl + '__token',
                type: 'POST',
                data: 'grant_type=password&username=' + $('#nfcUsername').val() + '&password=' + $('#nfcPassword').val()
            })
            .done(function (res) {
                // set new appCellToken
                Common.updateSessionStorage(res);

                let getExtCellList = function () {
                    return $.ajax({
                        type: 'GET',
                        url: opUrl + '__ctl/ExtCell',
                        headers: {
                            'Authorization': 'Bearer ' + Common.getToken(),
                            'Accept': 'application/json'
                        }
                    });
                };

                let deleteExtCell = function () {
                    return $.ajax({
                        type: 'DELETE',
                        url: opUrl + "__ctl/ExtCell('" + encodeURIComponent(Common.getCellUrl()) + "')",
                        headers: {
                            'Authorization': 'Bearer ' + Common.getToken()
                        }
                    });
                };

                let createExtCell = function () {
                    return $.ajax({
                        type: 'POST',
                        url: opUrl + '__ctl/ExtCell',
                        headers: {
                            'Authorization': 'Bearer ' + Common.getToken()
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
                        url: opUrl + "__ctl/ExtCell('" + encodeURIComponent(Common.getCellUrl()) + "')/$links/_Role",
                        headers: {
                            'Authorization': 'Bearer ' + Common.getToken()
                        },
                        data: JSON.stringify({
                            'uri': opUrl + "__ctl/Role(Name='supporter',_Box.Name='app-life-enrichers-community')"
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
                                // set new url, and reload article/userInfo
                                helpAuthorized = true;
                                Common.setCellUrl(opUrl);
                                Common.setBoxUrl(opUrl + Common.getBoxName() + '/');
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
                                Common.setCellUrl(opUrl);
                                Common.setBoxUrl(opUrl + Common.getBoxName() + '/');
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

        }).fail(function (appCellToken) {
            alert('error: get app cell token');
        });
    }).fail(function (appToken) {
        alert('error: get app token');
    });

    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#modal-nfcReader').modal('hide');
    view('top');
}


function openHelpConfirm() {
    $('#modal-helpConfirm').localize();
    $('#modal-helpConfirm').modal('show');
}

function closeHelpConfirm(f) {
    if(f) {
        $.ajax({
            type: 'DELETE',
            url: Common.getCellUrl() + "__ctl/ExtCell('" + encodeURIComponent(preCellUrl) + "')",
            headers: {
                'Authorization': 'Bearer ' + Common.getToken()
            }
        })
        .done(function() {
            helpAuthorized = false;
            Common.updateSessionStorage(preAppCellToken);
            Common.setCellUrl(preCellUrl);
            Common.setBoxUrl(preCellUrl + Common.getBoxName() + '/');
            getArticleList();
            getUserProfile();

            $(".endHelpOp").addClass('hidden');
            $(".startHelpOp").removeClass("hidden");
            $('header').css('background-color', '#008F00');
            $('h1').css('background-color', '#008F00');
            $('#during_help').addClass('hidden');
            view('top');
        })
        .fail(function() {
            alert('error: delete ext cell');
        });
    }
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    $('#modal-helpConfirm').modal('hide');
}

function startHelpOp() {
    $('#modal-startHelpOp').localize();
    $('#modal-startHelpOp').modal('show');

    $(".startHelpOp").addClass('hidden');
    $(".endHelpOp").removeClass("hidden");

    $('header').css('background-color', '#FF0000');
    $('h1').css('background-color', '#FF0000');

    $("#during_help").removeClass("hidden");
}

function viewInfoDisclosureDetail(type){
    $("#modal-inforDisclosureHistory .title_text").attr("data-i18n", "profile." + type);
    $('#modal-inforDisclosureHistory').localize();
    $('#modal-inforDisclosureHistory').modal('show');
}
function openInforDisclosureHistoryPer(type) {
    $("#modal-inforDisclosureHistoryPer .title_text").html(type);
    $('#modal-inforDisclosureHistoryPer').localize();
    $('#modal-inforDisclosureHistoryPer').modal('show');
}

function openSendReplyModal(reply, articleId, userReplyId, orgReplyId) {
    var arg = reply + ",'" + articleId + "'";
    if(userReplyId && orgReplyId) {
        arg += ", '" + userReplyId + "', '" + orgReplyId + "'";
    }

    $('#sendReplyButton').attr('onclick', 'replyEvent(' + arg + ')');
    $('#modal-sendReply').modal('show');
}

// load html
$(function() {
    $("#top").load("top.html", function() {
        $('#filterInfo').attr('onclick',"sortArticle('" + sort_key + "', false, " + TYPE.INFO + ')')
        $('#filterEvent').attr('onclick', "sortArticle('" + sort_key + "', false, " + TYPE.EVENT + ')')
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
    $("#helperOpHistory").load("helperOpHistory.html");
    $("#consentHistory").load("consentHistory.html");
    $("#viewHistory").load("viewHistory.html");
    $("#viewInforDisclosureHistory1").load("viewInforDisclosureHistory1.html", function(){
        $("#modal-inforDisclosureHistoryPer").load("modal-inforDisclosureHistoryPer.html");
    });
    $("#viewInforDisclosureHistory2").load("viewInforDisclosureHistory2.html", function(){
        $("#modal-inforDisclosureHistory").load("modal-inforDisclosureHistory.html");
    });
    $("#viewDataPortability").load("viewDataPortability.html");
    $("#viewDataExport").load("viewDataExport.html");
    $("#viewQRCode").load("viewQRCode.html");
    $("#articleDetail").load("articleDetail.html");
    $("#entryList").load("entryList.html");
    $("#modal-nfcReader").load("modal-nfcReader.html");
    $("#modal-helpConfirm").load("modal-helpConfirm.html");
    $("#modal-personalInfo").load("modal-personalInfo.html");
    $("#modal-personalInfo2").load("modal-personalInfo2.html");
    $("#modal-personalInfo3").load("modal-personalInfo3.html");
    $("#modal-startHelpOp").load("modal-startHelpOp.html");
    $("#modal-clubHistory").load("modal-clubHistory.html");
    $("#modal-sendReply").load("modal-sendReply.html");

    $('#dvOverlay').on('click', function() {
        $(".overlay").removeClass('overlay-on');
        $(".slide-menu").removeClass('slide-on');
    });

    $("#profileBasic").collapse('hide');

});

function getArticleList(divId) {
    getExtCellToken(function (token){
        var oData = 'article';
        var entityType = 'provide_information';

        $.ajax({
            type: "GET",
            url: Common.getToCellBoxUrl() + oData + '/' + entityType,
            headers: {
                "Authorization": "Bearer " + token,
                "Accept" : "application/json"
            }
        }).done(function(data) {
            $('#' + divId).empty();
            var list = [];
            var results = data.d.results;
            articleList = [];
            for(result of results.reverse()){
                if (result.type == TYPE.EVENT && moment(result.end_date) < currentTime) continue;

                var div = createArticleGrid(result.__id, result.title, result.start_date);
                list.push(div);
                getArticleListImage(result.__id, token);

                articleList.push({
                    id: result.__id,
                    type: result.type,
                    title: result.title,
                    updated: result.__updated,
                    start_date: result.start_date
                });
            }
            $('#' + divId).html(list.join(''));

            clearSort();

            getJoinInfoList(token);
        })
        .fail(function() {
            alert('failed to get article list');
        });
    }, divId);
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
        }
    })
    .done(function(res) {
        // set num
        var count = {}
        for (val of res.d.results) {
            if($('#join_' + val.provide_id)[0]) {
                if(count[val.provide_id] == null) {
                    count[val.provide_id] = {}
                    count[val.provide_id].join = 0;
                    count[val.provide_id].consider = 0;
                }

                switch(parseInt(val.entry_flag)) {
                    case REPLY.JOIN: count[val.provide_id].join++; break;
                    case REPLY.CONSIDER: count[val.provide_id].consider++; break;
                    default: alert('error: get reply information'); berak;
                }

            }
        }
        for (key in count) {
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
					profiles = {0:arguments}
				}
				$("#entry-list table").children().remove();
				if(arg[0] === REPLY.JOIN){
					$("#entry-list-title").attr("data-i18n", "pageTitle.participate");
				}else{
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
				view('entryList');

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
                    "\$filter": "provide_id eq '" + id + "'"
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
            var article = text[0].d.results;

            if (article.type == TYPE.EVENT && article.start_date && article.end_date) {
                var term = article.start_date + ' ' + article.start_time + ' ~ ' + (article.end_date == article.start_date ? '' : article.end_date) + ' ' + article.end_time;

                $('#replyContainer').css('display', '');
            } else {
                $('#replyContainer').css('display', 'none');
            }

            link = $('<a></a>').attr('href', article.url);
            link.text(article.url);

            var venue = article.venue ? '開催場所: ' + article.venue : '';
            $('#articleDetail .term')[0].style.display = venue ? '' : 'none';

            var img = $('<img>').attr('src', article.previewImg).addClass('thumbnail');

            $('#articleDetail .title').html(article.title);
            $('#articleDetail .url').html(link);
            $('#articleDetail .venue').html(venue);
            $('#articleDetail .date').html(term);
            $('#articleDetail .text').html(article.detail);

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

            var replys = reply[0].d.results
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
            $.when(
                $.ajax({
                    type: 'GET',
                    url: Common.getBoxUrl() + "reply/reply_history",
                    headers: {
                        "Authorization": "Bearer " + Common.getToken(),
                        "Accept": "application/json"
                    },
                    data: {
                        "\$filter": "provide_id eq '" + article.__id + "'"
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
                        "\$filter": "provide_id eq '" + article.__id + "' and user_cell_url eq '" + Common.getCellUrl() /* dummy ID */ + "'"
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

            view('articleDetail');

        })
        .fail(function () {
            alert('failed to get article detail\n\n' + err.join('\n'));
        });
    }, id);
}

function getExtCellToken(callback, id) {
    if (Common.getCellUrl() == ORGANIZATION_CELL_URL) {
        callback(Common.getToken(), id);
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

/**
 *
 * @param reply REPLY.JOIN or REPLY.CONSIDER
 * @param articleId
 * @param userReplyId if id is exist, this func's role is the update
 * @param orgReplyId
 */
function replyEvent(reply, articleId, userReplyId, orgReplyId) {
    if(reply == null) {
        alert('already done it');
        return;
    }
    var oData = 'reply';
    var entityType = 'reply_history';

    getExtCellToken(function(token) {
        var err = [];
        var anonymous = $('[name=checkAnonymous]').prop('checked');

        var saveToUserCell = function(){
            var method = 'POST';
            var url = Common.getBoxUrl() + oData + '/' + entityType;
            if(userReplyId) {
                method = 'PUT';
                url += "('" + userReplyId + "')";
            }

            return $.ajax({
                type: method,
                url: url,
                headers: {
                    "Authorization": "Bearer " + Common.getToken()
                },
                data: JSON.stringify({
                    // 'update_user_id'
                    'user_cell_url': Common.getCellUrl(), // dummy ID
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
            )
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
                    'user_cell_url': Common.getCellUrl(), // dummy ID
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
                            url: Common.getBoxUrl() + oData + '/' + entityType + "('" + id + "')",
                            headers: {
                                'Authorization': 'Bearer ' + Common.getToken()
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
                            url: Common.getBoxUrl() + oData + '/' + entityType + "('" + id + "')",
                            headers: {
                                'Authorization': 'Bearer ' + Common.getToken()
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
            )
        }

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
            if(reply == REPLY.JOIN) {
                join++;
                consider = --consider < 0 ? 0 : consider;
            } else {
                join = --join < 0 ? 0 : join;
                consider++;
            }
            $('#joinNum').html(join);
            $('#considerNum').html(consider);
        })
    }, userReplyId);
}


function updateReplyLink(reply, articleId, userReplyId, orgReplyId){
    var argJoin = '';
    var argConsider = '';
    switch (reply) {
        case REPLY.JOIN:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "'";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "'";
            break;

        case REPLY.CONSIDER:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "'";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "'";
            break;

        default:
            // data is not exist
            alert('error: read reply information');
            break;
    }

    $('#joinEvent').attr('href', "javascript:openSendReplyModal(" + argJoin + ")");
    $('#considerEvent').attr('href', "javascript:openSendReplyModal(" + argConsider + ")");
}

function sortArticle(key, reverse, type){
    aList = _.sortBy(articleList, function(item){return item[key]});
    if(reverse) aList = aList.reverse();
    if(type != null) filter = type;
    sort_key = key;

    var list = [];
    for(article of aList){
        if((filter != null) && article.type != filter) continue;
        var div = createArticleGrid(article.id, article.title, article.start_date);
        list.push(div);
    }
    $('#topEvent').empty();
    $('#topEvent').html(list.join(''));

    $.each(imageList, function(key, value) {
        $('#' + key).css('background-image', "url('" + value + "')");
    })

    $.each(joinList, function(key, value) {
        if ($('#join_' + key)[0]){
            $('#join_' + key).html(value);
        }
    })

    addLinkToGrid();
}

function clearSort() {
    filter = null;
    sortArticle('updated', true);
}

function createArticleGrid(id, title, date){
    date = date || "";
    var div = '<div data-href="javascript:getArticleDetail(\'' + id + '\')">';
    div += '<div class="col-xs-4 col-md-2 block_img">'
        + '<span id="' + id + '" class="cover"></span>'
        + '</div>';
    div += '<div class="col-xs-8 col-md-4 block_description">'
        + '<table class="stealth_table">'
        + '<tr class="date"><td>' + date + '</td></tr>'
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
    $.when(
        $.ajax({
            type: 'GET',
            url: Common.getBoxUrl() + "user_info/user_basic_information",
            headers: {
                "Authorization": "Bearer " + Common.getToken(),
                "Accept": "application/json"
            }
        }),
        $.ajax({
            type: 'GET',
            url: Common.getBoxUrl() + "user_info/user_health_information",
            headers: {
                "Authorization": "Bearer " + Common.getToken(),
                "Accept": "application/json"
            }
        }),
        $.ajax({
            type: 'GET',
            url: Common.getBoxUrl() + "user_info/user_vital",
            headers: {
                "Authorization": "Bearer " + Common.getToken(),
                "Accept": "application/json"
            }
        })
    )
    .done(function(res1, res2, res3){
        vitalList = _.sortBy(res3[0].d.results, function(item){return item.__updated});
        vitalList.reverse();

        var basicInfo = res1[0].d.results[0];
        var healthInfo = res2[0].d.results[0];
        var vital = vitalList[0];
        var preVital = vitalList[1];

        if(preVital != null) {
            var tempDiff = Math.round((vital.temperature - preVital.temperature) * 10)/10;
            var minDiff = vital.min_pressure - preVital.min_pressure;
            var maxDiff = vital.max_pressure - preVital.max_pressure;
            var pulseDiff = vital.pulse - preVital.pulse;

            tempDiff = tempDiff < 0 ? tempDiff : '+' + tempDiff;
            minDiff = minDiff < 0 ? minDiff : '+' + minDiff;
            maxDiff = maxDiff < 0 ? maxDiff : '+' + maxDiff;
            pulseDiff = pulseDiff < 0 ? pulseDiff : '+' + pulseDiff;
        }

        var sex;
        switch(basicInfo.sex) {
            case 'male': sex = '男性'; break;
            case 'female': sex = '女性'; break;
            default: sex = 'その他';
        }

        var basicInfoHtml = '';
        if(basicInfo != null) {
            basicInfoHtml = '<dt>'
                + '<dt>姓名:</dt>'
                + '<dd>' + basicInfo.name + '</dd>'
                + '<dt>ふりがな:</dt>'
                + '<dd>' + basicInfo.name_kana + '</dd>'
                + '<dt>性別:</dt>'
                + '<dd>' + sex + '</dd>'
                + '<dt>生年月日:</dt>'
                + '<dd>' + basicInfo.birthday + ' (' + currentTime.diff(moment(basicInfo.birthday), 'years') + '歳)</dd>'
                + '<dt>郵便番号:</dt>'
                + '<dd>' + basicInfo.postal_code + '</dd>'
                + '<dt>住所:</dt>'
                + '<dd>' + basicInfo.address + '</dd>'
                + '<dt>コメント:</dt>'
                + '<dd>' + basicInfo.comment + '</dd>'
                + '</dt>';
        }
        $('#basicInfo').html(basicInfoHtml);

        var healthInfoHtml = '';
        if (healthInfo != null) {
            healthInfoHtml = '<dt>'
                + '<dt>身長:</dt>'
                + '<dd>' + healthInfo.height + ' cm</dd>'
                + '<dt>体重:</dt>'
                + '<dd>' + healthInfo.weight + ' kg</dd>'
                + '<dt>BMI:</dt>'
                + '<dd>' + healthInfo.bmi + '</dd>'
                + '<dt>腹囲:</dt>'
                + '<dd>' + healthInfo.grith_abdomen + ' cm</dd>'
                + '</dt>';
        }
        $('#healthInfo').html(healthInfoHtml);

        var vitalHtml = '';
        if (vital != null) {
            vitalHtml = '<dt>'
                + '<dt>体温 (℃):</dt>'
                + '<dd>' + vital.temperature + ' (' + (tempDiff || '-') + ')' + '</dd>'
                + '<dt>血圧:</dt>'
                + '<dd>最高: ' + vital.max_pressure + ' mmHg' + ' (' + (maxDiff || '-') + ')' + '</dd>'
                + '<dd>最低: ' + vital.min_pressure + ' mmHg' + ' (' + (minDiff || '-') + ')' + '</dd>'
                + '<dt>脈拍:</dt>'
                + '<dd>' + vital.pulse + ' bpm' + ' (' + (pulseDiff || '-') + ')' +  '</dd>'
                + '</dt>';
        }
        $('#vital').html(vitalHtml);

    })
    .fail(function() {
        alert('error: get user profile');
    });

}
