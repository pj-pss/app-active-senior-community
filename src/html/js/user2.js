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
var articleList;
var imageList = {};
var joinList = {};
var personalJoinList = {};
var sort_key = 'updated';
var filter = null;
var currentTime = moment();
var operationCellUrl = '';
var userInfo = {};
var helpAuthorized = false;
var nowViewMenu = 'top';

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
    });
};

getNamesapces = function () {
    return ['common', 'glossary'];
};

async function getArticleList() {
    await getUserProfile();
    getExtCellToken(function (token){
        var oData = 'article';
        var entityType = 'provide_information';

        var now = String(new Date().getTime());

        var filter = '(target_age eq ' + AGE.ALL + ' or target_age eq ' + userInfo.age + ') and ';
        if (userInfo.sex == SEX.ALL) {
            filter += 'true';
        } else {
            filter += '(target_sex eq ' + SEX.ALL + ' or target_sex eq ' + userInfo.sex + ')';
        }
        $.ajax({
            type: "GET",
            url: Common.getToCellBoxUrl() + oData + '/' + entityType + '?\$filter=(end_date gt \'' + now + '\' or type eq ' + TYPE.INFO + ') and ' + filter + '&\$orderby=__updated desc',
            headers: {
                "Authorization": "Bearer " + token,
                "Accept" : "application/json"
            },
            data: {
                '\$top': ARTICLE_NUM
            }
        }).done(function(data) {
            articleList = data.d.results;
            setArticle(data.d.results, token);
            getJoinInfoList(token);
            getPersonalJoinInfo();
        })
        .fail(function() {
            alert('failed to get article list');
        });
    });
}

function getArticleListImage(id, token, topContent) {
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
            if (topContent) {
                $('.top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + image + "')");
            } else {
                $('#img_' + id).attr('src', image);
            }
            imageList[id] = image;
        }, this);
        reader.readAsArrayBuffer(res);
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        alert(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
    });
}

function getJoinInfoList(token) {
    joinList = {};
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
            '\$top': REPLY_COUNT
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
            var joinHtml = '<i class="fa fa-star fa-2x icon" aria-hidden="true"></i>'+
            count[key].consider +
            ' <i class="fas fa-calendar-check fa-2x icon" aria-hidden="true"></i>' +
            count[key].join;
            joinList[key] = joinHtml;
            $('#join_' + key).html(joinHtml);
        }
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        alert(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
    });
}

function getPersonalJoinInfo() {
    personalJoinList = {};
    getCurrentCellToken(function (token) {
        // get reply list
        var oData = 'reply';
        var entityType = 'reply_history';

        var boxUrl = helpAuthorized ? operationCellUrl + Common.getBoxName() + '/' : Common.getBoxUrl();
        $.ajax({
            type: "GET",
            url: boxUrl + oData + '/' + entityType,
            headers: {
                "Authorization": "Bearer " + token,
                "Accept": "application/json"
            },
            data: {
                '\$top': REPLY_LIST_NUM
            }
        })
        .done(function (res) {
            // set num
            var count = {};
            for (let val of res.d.results) {
                if ($('#join_' + val.provide_id)[0]) {
                    $('#join_' + val.provide_id).parents('li').addClass('entry' + val.entry_flag);
                    personalJoinList[val.provide_id] = val.entry_flag;
                }
            }
        })
        .fail(function (XMLHttpRequest, textStatus, errorThrown) {
            alert(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
        });
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
                '\$top': REPLY_LIST_NUM
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

function setArticle(articleList, token){

    $('#topInfoList>ul').children().remove();
    $('.top-content').children().remove();
    let first = true;
    for(let article of articleList){
        if (first) {
            $('.top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
        }
        getArticleListImage(article.__id, token, first);
        first = false;
    }

    // $.each(imageList, function(key, value) {
    //     $('#' + key).css('background-image', "url('" + value + "')");
    // });

    // $.each(joinList, function(key, value) {
    //     if ($('#join_' + key)[0]){
    //         $('#join_' + key).html(value);
    //     }
    // });

    // addLinkToGrid();
}

function setFilter(key, reset) {
    let first = true;
    for (let article of articleList) {
        if (!reset && article.type != key) continue;
        if (first) {
            $('#topInfoList>ul').children().remove();
            $('.top-content').children().remove();

            $('.top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
            $('.top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + imageList[article.__id] + "')");
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
            $('#img_' + article.__id).attr('src', imageList[article.__id]);
        }
        first = false;
    }
    if (first) {
        showMessage(i18next.t('msg.noContent'));
        return;
    }

    setEntryNumber();
}

function setPersonalFilter(key) {
    let first = true;
    for (let article of articleList) {
        if (!personalJoinList.hasOwnProperty(article.__id) || personalJoinList[article.__id] != key) continue;
        if (first) {
            $('#topInfoList>ul').children().remove();
            $('.top-content').children().remove();

            $('.top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
            $('.top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + imageList[article.__id] + "')");
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
            $('#img_' + article.__id).attr('src', imageList[article.__id]);
        }
        first = false;
    }
    if (first) {
        showMessage(i18next.t('msg.noContent'));
        return;
    }

    setEntryNumber();
    switchCurrentButton(key == REPLY.JOIN ? 'fa-calendar-check' : 'fa-star');
    viewTop();
}

function clearFilter() {
    setFilter('', true);
    switchCurrentButton('fa-home');
    viewTop();
}

function setEntryNumber() {
    for (let key in joinList) {
        $('#join_' + key).html(joinList[key]);
    }
}

function formatDate(date) {
    date = date || "";
    var dispDate;
    if (date) {
        var startDate = new Date(Math.floor(date));
        dispDate = moment(startDate).format("YYYY/MM/DD") + " (" + i18next.t("dayOfTheWeek." + moment(startDate).format("ddd")) + ")";
    } else {
        dispDate = "";
    }
    return dispDate;
}

function createArticleGrid(id, title, date, type){
    let dispDate = formatDate(date);
    let entry =
        '<i class="fa fa-star fa-2x icon"></i>0' +
        ' <i class="fas fa-calendar-check fa-2x icon"></i>0';
    var li =
        '<li data-href="javascript:getArticleDetail(\'' + id + '\')" class=\'display' + String(type) + '\'>' +
            '<div class="list-image new">' +
                '<img class="list-thumbnail" id ="img_' + id + '">' +
            '</div>' +
            '<div class="list-text">' +
                '<div class="title">' +
                    title +
                '</div>' +
                '<div class="etc_area">' +
                    '<div class="date">' +
                        dispDate +
                    '</div>' +
                    '<div class="evaluation" id="join_' + id + '">' +
                        (dispDate ? entry : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</li>';

    return li;
}

function createTopContent(id, title, date, type) {
    let entry =
        '<i class="fa fa-star fa-2x icon"></i>0' +
        ' <i class="fas fa-calendar-check fa-2x icon"></i>0';
    let dispDate = formatDate(date);
    return  '<div class="etc_area">' +
                '<div class="date">' +
                    dispDate +
                '</div>' +
                '<div class="evaluation" id="join_' + id + '">' +
                    (dispDate ? entry : '') +
                '</div>' +
            '</div>' +
            '<div class="title-area">' +
                title +
            '</div>';
}

async function getUserProfile() {
    getCurrentCellToken(await function (token) {
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
        .done(function (res1, res2, res3, res4, res5, res6) {
            vitalList = _.sortBy(res3[0].d.results, function (item) { return item.__updated; });
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
            if (preVital != null) {
                tempDiff = Math.round((vital.temperature - preVital.temperature) * 10) / 10;
                minDiff = vital.min_pressure - preVital.min_pressure;
                maxDiff = vital.max_pressure - preVital.max_pressure;
                pulseDiff = vital.pulse - preVital.pulse;

                tempDiff = tempDiff < 0 ? tempDiff : '+' + tempDiff;
                minDiff = minDiff < 0 ? minDiff : '+' + minDiff;
                maxDiff = maxDiff < 0 ? maxDiff : '+' + maxDiff;
                pulseDiff = pulseDiff < 0 ? pulseDiff : '+' + pulseDiff;
            }

            var sex;
            switch (basicInfo.sex) {
                case 'male':
                    sex = i18next.t('sex.male');
                    userInfo.sex = SEX.MALE;
                    break;

                case 'female':
                    sex = i18next.t('sex.female');
                    userInfo.sex = SEX.FEMALE;
                    break;

                default:
                    sex = i18next.t('sex.other');
                    userInfo.sex = SEX.ALL;
            }

            var basicInfoHtml = '';
            if (basicInfo) {
                basicInfoHtml = '<dt>' +
                    '<dt>' + i18next.t('basicInfo.name') + ':</dt>' +
                    '<dd>' + basicInfo.name + '<br>(' + basicInfo.name_kana + ')</dd>' +
                    '<dt>' + i18next.t('basicInfo.birthday') + ' (' + i18next.t('basicInfo.age') + '):</dt>' +
                    '<dd>' + basicInfo.birthday + ' (' + currentTime.diff(moment(basicInfo.birthday), 'years') + ')</dd>' +
                    '<dt>' + i18next.t('basicInfo.sex') + ':</dt>' +
                    '<dd>' + sex + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.address') + ':</dt>' +
                    '<dd>' + basicInfo.address + '</dd>' +
                    '<dt>' + i18next.t('basicInfo.residentType') + ':</dt>' +
                    '<dd>' + household.resident_type + '</dd>' +
                    '</dt>';
            }
            $('#basicInfo').html(basicInfoHtml);

            var healthInfoHtml = '';
            if (healthInfo) {
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
            if (vital) {
                vitalHtml = '<dt>' +
                    '<dt>' + i18next.t('vital.bloodPressure') + ':</dt>' +
                    '<dd>' + i18next.t('vital.max') + ': ' + vital.max_pressure + ' mmHg' + ' (' + (maxDiff || '-') + ')' + '</dd>' +
                    '<dd>' + i18next.t('vital.min') + ': ' + vital.min_pressure + ' mmHg' + ' (' + (minDiff || '-') + ')' + '</dd>' +
                    '<dt>' + i18next.t('vital.pulse') + ':</dt>' +
                    '<dd>' + vital.pulse + ' bpm' + ' (' + (pulseDiff || '-') + ')' + '</dd>' +
                    '<dt>' + i18next.t('vital.bodyTemp') + ':</dt>' +
                    '<dd>' + vital.temperature + ' &deg;C (' + (tempDiff || '-') + ')' + '</dd>' +
                    '</dt>';
            }
            $('#vital').html(vitalHtml);

            var age = currentTime.diff(moment(basicInfo.birthday), 'years');
            if (age < 60) {
                userInfo.age = AGE.UNDER_FIFTY;
            } else if (age < 70) {
                userInfo.age = AGE.SIXTY;
            } else if (age < 80) {
                userInfo.age = AGE.SEVENTY;
            } else {
                userInfo.age = AGE.OVER_EIGHTY;
            }

            if (!profileJson.Image || profileJson.Image.length == 0) {
                var cellImgDef = ut.getJdenticon(Common.getCellUrl());
                $("#drawer_menu .user-info .pn-list-icon img").attr("src", cellImgDef);
                $("#editPicturePreview").attr("src", cellImgDef);
            } else {
                $("#drawer_menu .user-info .pn-list-icon img").attr("src", profileJson.Image);
                $("#editPicturePreview").attr("src", profileJson.Image);
            }

            $('#user-name-form').attr('placeholder', profileJson.DisplayName);
            $('#user-name-form').attr('aria-label', profileJson.DisplayName);

            let location = evacuation.not_at_home ? i18next.t('locationState.outdoor') : i18next.t('locationState.indoor');
            $('#userLocation').html(location);
            $("#drawer_menu .user-info .account-info .user-name").text(profileJson.DisplayName);

            $('#modal-helpConfirm .userName').html(basicInfo.name);
            $('#modal-startHelpOp .userName').html(basicInfo.name);

            $("#drawer_menu .user-info .user-status span").text(location);

            if (!helpAuthorized) {
                $(".top .header-title .subtitle").text(i18next.t('msg.duringOpHelp', { name: basicInfo.name }));
            }

        })
        .fail(function () {
            alert('error: get user profile');
        });
    });

}

function view(menuId) {
    $("#" + nowViewMenu).addClass('d-none');
    $("#" + menuId).removeClass('d-none');
    $("#" + menuId).localize();
    nowViewMenu = menuId;
    window.scrollTo(0, 0);
}

function closeMenu() {
    $('#drawer_menu').animate({
        width: 'hide'
    }, 300, function () {
        $('#menu-background').hide();
        return false;
    });
}

function viewProfile() {
    $("#edit-picture").click(function () {
        clearInput(this);
    }).change(function () {
        readURL(this);
    });
    ut.createCropperModal2({ dispCircleMaskBool: true });

    getUserProfile();
    $("#popupEditDisplayNameErrorMsg").empty();
    switchCurrentButton('fa-address-card');
    $(".top .header-title .title").text(i18next.t('pageTitle.profile'));
    $("#sort_btn").hide();
    view('profile');
}

function viewTop() {
    $(".top .header-title .title").text(i18next.t('pageTitle.articleList'));
    $("#sort_btn").show();
    view('top');
}

function switchCurrentButton(buttonName) {
    $('footer>button.current').removeClass('current');
    $('footer>button>.' + buttonName).parent().addClass('current');
}

// load html
$(function () {
    let topHtml =   '<div class="top-content new"></div>' +
                    '<div class="list" id="topInfoList">' +
                        '<ul></ul>' +
                    '</div>';
    $("#top").html(topHtml);
    $("#profile").load("profile.html", function() {
        /*Edit button clicked action*/
        $('.edit-btn').on('click', function () {
            if ($(this).attr('id') == 'user-name-edit-btn') {
                Control_Input_Editer($(this), $('#user-name-form'));
            }
        })
    });
});

function showMessage(msg) {
    $('#messageModal .modal-body').html(msg);
    $('#messageModal').modal('show');
}
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

    $('#modal-qrReader').modal('hide');
	clearFilter();
}

function startHelpOp() {
    $('#modal-startHelpOp').localize();
    $('#modal-startHelpOp').actionHistoryShowModal();

    $(".startHelpOp").hide();
    $(".endHelpOp").show();
    $(".top .header-title .subtitle").show();
    $('#edit-picture').prop('disabled', true);
    $('#edit-picture +span').hide();
    $('#user-name-edit-btn').hide();
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

                $(".startHelpOp").show();
                $(".endHelpOp").hide();
                $(".top .header-title .subtitle").hide();
                $('#edit-picture').prop('disabled', false);
                $('#edit-picture +span').show();
                $('#user-name-edit-btn').show();
                clearFilter();

            })
            .fail(function() {
                alert('error: delete ext cell');
            });
        })
        .fail(function (XMLHttpRequest, textStatus, errorThrown) {
            alert(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
        });
    }
    $('#modal-helpConfirm').modal('hide');
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
        saveUserName();
        target_input.attr('disabled', true);
    }
}

function saveUserName() {
    if (validateDisplayName($("#user-name-form").val(), "popupEditDisplayNameErrorMsg")) {
        Common.refreshToken(function () {
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: Common.getCellUrl() + '__/profile.json',
                headers: {
                    "Accept": "application/json"
                }
            }).done(function (profileJson) {
                var saveData = _.clone(arguments[0]);
                saveData.DisplayName = $("#user-name-form").val();
                $.ajax({
                    type: "PUT",
                    url: Common.getCellUrl() + '__/profile.json',
                    data: JSON.stringify(saveData),
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + Common.getToken()
                    }
                }).done(function () {
                    viewProfile();
                });
            });
        });
    }
}

editDisplayNameBlurEvent = function () {
    var displayName = $("#user-name-form").val();
    var displayNameSpan = "popupEditDisplayNameErrorMsg";
    validateDisplayName(displayName, displayNameSpan);
};

function validateDisplayName(displayName, displayNameSpan) {
    var MINLENGTH = 1;
    var lenDisplayName = displayName.length;
    if (lenDisplayName < MINLENGTH || displayName == undefined || displayName == null || displayName == "") {
        return false;
    }

    var MAXLENGTH = 128;
    $("#" + displayNameSpan).empty();
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

                Common.refreshToken(function () {
                    $.ajax({
                        type: "GET",
                        dataType: 'json',
                        url: Common.getCellUrl() + '__/profile.json',
                        headers: {
                            "Accept": "application/json"
                        }
                    }).done(function (profileJson) {
                        var saveData = _.clone(arguments[0]);
                        saveData.Image = $("#editPicturePreview").attr("src")
                        $.ajax({
                            type: "PUT",
                            url: Common.getCellUrl() + '__/profile.json',
                            data: JSON.stringify(saveData),
                            headers: {
                                'Accept': 'application/json',
                                'Authorization': 'Bearer ' + Common.getToken()
                            }
                        }).done(function () {
                            viewProfile();
                        });
                    });
                });
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
