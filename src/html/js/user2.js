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
var articleListAll;
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
var skip = 0;
var isLoad1 = false;
var isLoad2 = false;

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
        getCurrentCellToken(token => {
            getUserBasicInfo(token)
                .done(() => {
                    getArticleList();
                    getUserHousehold(token);
                });
            getUserHealthInfo(token);
            getUserVital(token);
            getUserProfile(token);
            getUserEvacuation(token);
        });
        actionHistory.logWrite('top');
    });
};

getNamesapces = function () {
    return ['common', 'glossary'];
};

function getArticleList() {
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
            skip = 0;
            isLoad1 = false;
            isLoad2 = false;
            articleListAll = data.d.results;
            setArticle(articleListAll, token, true);
            getJoinInfoList(token);
            getPersonalJoinInfo();
            $("main").off('touchmove mousewheel');
            $("main").on('touchmove mousewheel', function(event){
                if ($("#sort_btn").css("display") === "none" || skip * ARTICLE_SKIP_NUM > ARTICLE_NUM || isLoad1 || isLoad2){
                    return;
                }
                var current = window.scrollY + window.innerHeight;
                if (current < $(this).get(0).scrollHeight - 50) return;
                isLoad1 = isLoad2 = true;
                getExtCellToken(function (token){
                    setArticle(articleListAll, token, false);
                    getJoinInfoList(token);
                    getPersonalJoinInfo();
                });
            });
        })
        .fail(function() {
            showMessage('failed to get article list');
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
                $('#top .top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + image + "')").css('background-size', 'cover');
            } else {
                $('#img_' + id).attr('src', image);
            }
            imageList[id] = image;
        }, this);
        reader.readAsArrayBuffer(res);
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        showMessage(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
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
                    default: showMessage('error: get reply information');
                }

            }
        }
        for (let key in count) {
            var joinHtml = '<i class="fa fa-star fa-2x icon" aria-hidden="true"></i><span class="consider">'+
            count[key].consider +
            '</span> <i class="fas fa-calendar-check fa-2x icon" aria-hidden="true"></i><span class="join">' +
            count[key].join + '</span>';
            joinList[key] = joinHtml;
            $('#join_' + key).html(joinHtml);
        }
        isLoad1 = false;
    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        showMessage(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
    });
}

function getPersonalJoinInfo() {
    personalJoinList = {};
    getCurrentCellToken(function (token) {
        // get reply list
        var oData = 'reply';
        var entityType = 'reply_history';

        var boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';
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
            isLoad2 = false;
        })
        .fail(function (XMLHttpRequest, textStatus, errorThrown) {
            showMessage(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
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
				$("#entryList ul").children().remove();
                var title;
                var replyStr;
                if (arg[0] === REPLY.JOIN) {
                    title = "pageTitle.participate";
                    replyStr = 'reply.join';
                } else {
                    title = "pageTitle.consider";
                    replyStr = 'reply.consider';
                }

				for(var i = 0; i < this.entryDatas.length; i++){
					var updated = moment(new Date(parseInt(this.entryDatas[i].__updated.match(/\/Date\((.*)\)\//i)[1],10)));
					var dispname = '<span data-i18n=\"entry.anonymous\"></span>';
					var	imgsrc = "../img/user-circle.png";
					if(!this.entryDatas[i].anonymous){
						dispname = '<span>' + profiles[i][0].DisplayName + '</span>';
						if(profiles[i][0].Image !== ""){
							imgsrc = profiles[i][0].Image;
						}
					}

                    var appendHtml =
                        '<li>' +
                            '<div class="pn-list-h">' +
                                '<div class="pn-list-icon">' +
                                        '<img src="' + imgsrc + '" alt="icon">' +
                                    '</div>' +
                                    '<div class="account-info">' +
                                    '<div class="user-name">' + dispname + '</div>' +
                                    '<div>' +
                        '<span>' + updated.format("YYYY/MM/DD HH:mm:ss") + '</span>' +
                                        '</div>' +
                                '</div>' +
                            '</div>' +
                        '</li>';

                    $("#entryList ul").append(appendHtml);
				}

                $('#entryList').actionHistoryShowView({ detail: $('#articleDetail .news-title').text(), reply: i18next.t(replyStr) });

			},this)).fail(function() {
				console.log('error: get profile.json');
			});
	    })
	    .fail(function() {
	        showMessage('error: get reply_history');
	    });

    }, [entryFlag,articleId]);
}

/**
 * Get token for organization cell and callback argument function.
 * @param {function} callback
 * @param {string} id :article/userReply/etc... (for callback function)
 */
function getExtCellToken(callback, id) {
    if (Common.getCellUrl() == organization_cell_url) {
        callback(Common.getToken(), id);
    } else {
        if(helpAuthorized) {
            $.when(Common.getTranscellToken(operationCellUrl), Common.getAppAuthToken(operationCellUrl))
                .done(function (result1, result2) {
                    let tempTCAT = result1[0].access_token; // Transcell Access Token
                    let tempAAAT = result2[0].access_token; // App Authentication Access Token
                    Common.getProtectedBoxAccessToken4ExtCell(operationCellUrl, tempTCAT, tempAAAT).done(function (appCellToken) {
                        $.when(Common.getTranscellToken(organization_cell_url), Common.getAppAuthToken(organization_cell_url))
                            .done(function (result11, result12) {
                                let tempTCAT2 = result11[0].access_token; // Transcell Access Token
                                let tempAAAT2 = result12[0].access_token; // App Authentication Access Token
                                Common.getProtectedBoxAccessToken4ExtCell(organization_cell_url, tempTCAT2, tempAAAT2).done(function (appCellToken2) {
                                    callback(appCellToken2.access_token, id);
                                }).fail(function (error) {
                                    showMessage("error: get org cell token");
                                });
                            })
                            .fail(function (error) {
                                showMessage("error: get trance cell token");
                            });
                    }).fail(function (error) {
                        showMessage("error: get ext cell token");
                    });
                })
                .fail(function () {
                    showMessage("error: get ext cell token");
                });
        } else {
            $.when(Common.getTranscellToken(organization_cell_url), Common.getAppAuthToken(organization_cell_url))
                .done(function (result1, result2) {
                    let tempTCAT = result1[0].access_token; // Transcell Access Token
                    let tempAAAT = result2[0].access_token; // App Authentication Access Token
                    Common.perpareToCellInfo(organization_cell_url, tempTCAT, tempAAAT, function (cellUrl, boxUrl, token) {
                        callback(token, id);
                    });
                })
                .fail(function () {
                    showMessage('failed to get token');
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
                    showMessage("error: get ext cell access token");
                });
            })
            .fail(function () {
                showMessage("error: get trance cell token");
            });
    } else {
        callback(Common.getToken(), id);
    }
}

function setArticle(articleListAll, token, isClear = true){
    let first;
    if(isClear){
        $('#topInfoList>ul').children().remove();
        $('#top .top-content').children().remove();
        first = true;
    }else{
        first = false;
    }
    var skipArticleList = articleListAll.slice(skip * ARTICLE_SKIP_NUM, (skip + 1) * ARTICLE_SKIP_NUM);
    for(let article of skipArticleList){
        if (first) {
            $('#top .top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
            $('#top .top-content').attr('data-href', "javascript:getArticleDetail('" + article.__id + "')");
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
        }
        getArticleListImage(article.__id, token, first);
        first = false;
    }
    skip = skip + 1;
    articleList = articleListAll.slice(0, (skip + 1) * ARTICLE_SKIP_NUM);
    setNewBadge();
    addLinkToGrid();
}

function setFilter(key, reset) {
    let first = true;
    for (let article of articleList) {
        if (!reset && article.type != key) continue;
        if (first) {
            $('#topInfoList>ul').children().remove();
            $('#top .top-content').children().remove();

            $('#top .top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
            $('#top .top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + imageList[article.__id] + "')").css('background-size', 'cover');
            $('#top .top-content').attr('data-href', "javascript:getArticleDetail('" + article.__id + "')");
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
            $('#img_' + article.__id).attr('src', imageList[article.__id]);
        }
        first = false;
    }
    if (first) {
        showMessage(i18next.t('msg.noContent'));
        return false;
    }
    setEntryNumber();
    switchCurrentButton('fa-home');
    $('#sort_btn').addClass('active');
    setNewBadge();
    addLinkToGrid();
    return true;
}

function setPersonalFilter(key) {
    let first = true;
    for (let article of articleList) {
        if (!personalJoinList.hasOwnProperty(article.__id) || personalJoinList[article.__id] != key) continue;
        if (first) {
            $('#topInfoList>ul').children().remove();
            $('#top .top-content').children().remove();

            $('#top .top-content').html(createTopContent(article.__id, article.title, article.start_date, article.type));
            $('#top .top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + imageList[article.__id] + "')").css('background-size', 'cover');
            $('#top .top-content').attr('data-href', "javascript:getArticleDetail('" + article.__id + "')");
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
    setNewBadge();
    addLinkToGrid();
    viewTop();
}

function clearFilter() {
    setFilter('', true);
    switchCurrentButton('fa-home');
    $('#sort-menu li').removeClass('checked');
    $('#sort-menu li.all').addClass('checked');
    $('#sort_btn').removeClass('active');
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
            '<div class="list-image">' +
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

function getUserAllProfile() {
    getCurrentCellToken(function (token) {
        getUserBasicInfo(token)
            .done(() => { getUserHousehold(token);});
        getUserHealthInfo(token);
        getUserVital(token);
        getUserProfile(token);
        getUserEvacuation(token);
    });

}

function getUserBasicInfo (token) {
    let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';

    return $.ajax({
        type: 'GET',
        url: boxUrl + "user_info/user_basic_information",
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    }).done(res => {
        let basicInfo = res.d.results[0];

        let sex;
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

        let age = currentTime.diff(moment(basicInfo.birthday), 'years');
        if (age < 60) {
            userInfo.age = AGE.UNDER_FIFTY;
        } else if (age < 70) {
            userInfo.age = AGE.SIXTY;
        } else if (age < 80) {
            userInfo.age = AGE.SEVENTY;
        } else {
            userInfo.age = AGE.OVER_EIGHTY;
        }

        let basicInfoHtml = '';
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
                '</dt>';
        }
        $('#basicInfo').html(basicInfoHtml);

        $('#modal-helpConfirm .userName').html(basicInfo.name);
        $('#modal-startHelpOp .userName').html(basicInfo.name);

        if (!helpAuthorized) {
            $(".top .header-title .subtitle").text(i18next.t('msg.duringOpHelp', { name: basicInfo.name }));
        }
    })
}

function getUserHealthInfo (token) {
    let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';

    return $.ajax({
        type: 'GET',
        url: boxUrl + "user_info/user_health_information",
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    }).done(res => {
        let healthInfo = res.d.results[0];

        let healthInfoHtml = '';
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
    })
}

function getUserVital (token) {
    let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';

    return $.ajax({
        type: 'GET',
        url: boxUrl + "user_info/user_vital",
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    }).done(res => {
        vitalList = _.sortBy(res.d.results, function (item) { return item.__updated; });
        vitalList.reverse();
        let vital = vitalList[0];
        let preVital = vitalList[1];

        let tempDiff;
        let minDiff;
        let maxDiff;
        let pulseDiff;
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

        let vitalHtml = '';
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

    })
}

function getUserHousehold (token) {
    let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';

    return $.ajax({
        type: 'GET',
        url: boxUrl + "user_info/user_household",
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    }).done(res => {
        let household = res.d.results[0];

        let resident = '<dt>' + i18next.t('basicInfo.residentType') + ':</dt>' +
            '<dd>' + household.resident_type + '</dd>';
        $('#basicInfo').append(resident);
    })
}

function getUserProfile (token) {
    let cellUrl = helpAuthorized ? operationCellUrl : Common.getCellUrl();

    return $.ajax({
        type: "GET",
        dataType: 'json',
        url: cellUrl + '__/profile.json',
        headers: {
            "Accept": "application/json"
        }
    }).done(res => {
        let profileJson = res;

        if (!profileJson.Image || profileJson.Image.length == 0) {
            let cellImgDef = ut.getJdenticon(Common.getCellUrl());
            $("#drawer_menu .user-info .pn-list-icon img").attr("src", cellImgDef);
            $("#editPicturePreview").attr("src", cellImgDef);
        } else {
            $("#drawer_menu .user-info .pn-list-icon img").attr("src", profileJson.Image);
            $("#editPicturePreview").attr("src", profileJson.Image);
        }

        $('#user-name-form').attr('placeholder', profileJson.DisplayName);
        $('#user-name-form').attr('aria-label', profileJson.DisplayName);

        $("#drawer_menu .user-info .account-info .user-name").text(profileJson.DisplayName);
    })
}

function getUserEvacuation (token) {
    let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';

    return $.ajax({
        type: "GET",
        url: boxUrl + 'user_info/user_evacuation',
        headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    }).done(res => {
        let evacuation = res.d.results[0];

        let location = evacuation.not_at_home ? i18next.t('locationState.outdoor') : i18next.t('locationState.indoor');
        $('#userLocation').html(location);
        $("#drawer_menu .user-info .user-status span").text(location);
    })
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

    $("#popupEditDisplayNameErrorMsg").empty();
    switchCurrentButton('fa-address-card');
    $('#profile').actionHistoryShowView();
}

function viewTop() {
    $('#top').actionHistoryShowView();
}

function viewArticleDetail() {
    // get cell name
    getExtCellToken(token => {
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: organization_cell_url + "__/profile.json",
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
        }).done(profile => {
            $(".top .header-title .title").text(profile.DisplayName);
        })
    });
    disableEntryListLink();
    $('#articleDetail').actionHistoryShowView({ detail: $('#articleDetail .news-title').text()});
}

function viewActionHistory(){
    $('footer>button.current').removeClass('current');
    openHistory();
}

function switchCurrentButton(buttonName) {
    $('footer>button.current').removeClass('current');
    $('footer>button>.' + buttonName).parent().addClass('current');
}

// load html
$(function () {
    let topHtml =   '<div class="top-content"></div>' +
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
    $("#opHistory").load("viewHistory.html");
    let articleDetail =
        '<div class="top-content news-top-content">' +
        '</div>' +
        '<div class="news-article">' +
            '<div class="etc_area mb-3">' +
                '<div class="evaluation">' +
                    '<i class="fa fa-star fa-2x icon-large"></i>' +
                    '<span class="news-icon-text">' +
                        '<a id="considerNum"></a>' +
                    '</span>' +
                    '<i class="fas fa-calendar-check fa-2x icon-large"></i>' +
                    '<span class="news-icon-text">' +
                        '<a id="joinNum"></a>' +
                    '</span>' +
                '</div>' +
            '</div>' +
            '<div class="news-title mb-3"></div>' +
            '<div class="news-venue"></div>' +
            '<div class="news-date mb-3"></div>' +
            '<pre class="news-text mb-3"></pre>' +
            '<div class="news-url"></div>' +
        '</div>';
    $("#articleDetail").html(articleDetail);
    let entryHtml =
        '<div class="bg-gray">' +
            '<div class="list">' +
                '<ul></ul>' +
            '</div>' +
        '</div>';
    $("#entryList").html(entryHtml);
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
    Instascan.Camera.getCameras().then(function (cameras) {
        cameraId = cameras.length - 1;
        initScanner(options);
        initCamera(cameraId);
        scanStart(function (content){
            authorizedQrReader(decryptQR(content));
        });
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
        showMessage('error: json parse error');
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
                        showMessage(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
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
                    'uri': operationCellUrl + "__ctl/Role(Name='supporter',_Box.Name='" + APP_BOX_NAME + "')"
                })
            })
                .then(
                    function (res) {
                        return res;
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        showMessage(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
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
                        getUserAllProfile();
                        startHelpOp();
                    })
                    .fail(function () {
                        showMessage('error: help operation');
                    });
            } else {
                createExtCell().then(setRole)
                    .done(function () {
                        helpAuthorized = true;
                        getArticleList();
                        getUserAllProfile();
                        startHelpOp();
                    })
                    .fail(function () {
                        showMessage('error: help operation');
                    });
            }
        });

    })
    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
        showMessage(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
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
                showMessage('error: delete ext cell');
            });
        })
        .fail(function (XMLHttpRequest, textStatus, errorThrown) {
            showMessage(XMLHttpRequest.status + '\n' + textStatus + '\n' + errorThrown);
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
                showMessage('error: invalid password');
            return false;
        }

        let pUrl = $.url(qrJson.url);
        if (!(pUrl.attr('protocol').match(/^(https)$/) && pUrl.attr('host'))) {
            showMessage('error: invalid url');
            return false;
        } else {
            let labels = pUrl.attr('host').split('.');
            for (let label of labels) {
                if (!label.match(/^([a-zA-Z0-9\-])+$/) || label.match(/(^-)|(-$)/)) {
                    showMessage('error: invalid url');
                    return false;
                }
            }

            if (pUrl.attr('source') == Common.getCellUrl()) {
                showMessage('error: own user cell');
                return false;
            }
        }

        return true;
    }

    showMessage('error: invalid QRcode data');
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
                    actionHistory.logWrite('profileEdit');
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
                            actionHistory.logWrite('profileEdit');
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

function openHistory(){
	$("#opHistory ul").children().remove();

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
					img = images[result['action_user_cell_url']] ? images[result['action_user_cell_url']] : ut.getJdenticon(result['action_user_cell_url']);
				}else{
					img = images[result['user_cell_url']] ? images[result['user_cell_url']] : ut.getJdenticon(result['user_cell_url']);
				}
				var updated = moment(new Date(parseInt(result.__updated.match(/\/Date\((.*)\)\//i)[1],10)));

				var appendHtml = '<li>' +
				                     '<div class="pn-list-h">' +
				                         '<div class="pn-list-icon">' +
				                             '<img src="' + img + '" alt="icon">' +
				                         '</div>' +
				                         '<div class="account-info">' +
				                             '<div class="display-date">' + updated.format("YYYY/MM/DD HH:mm:ss") + '</div>' +
				                             '<div>' +
				                                 '<span>' + result.action_detail + '</span>' +
				                             '</div>' +
				                         '</div>' +
				                     '</div>' +
								  '</li>';
				$("#opHistory ul").append(appendHtml);
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
			        url: operationCellUrl + APP_BOX_NAME + '/action/action_history' + query,
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
		        url: Common.getCellUrl() + APP_BOX_NAME + '/action/action_history' + query,
	            headers: {
					"Accept" : "application/json",
	                "Authorization": "Bearer " + Common.getToken()
	            }
			}).done(displayHistoryFunc);
		});
	}
}

function setNewBadge() {
    getCurrentCellToken(function (token) {
        let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';
        $.ajax({
            type: 'GET',
            url: boxUrl + "action/action_history",
            headers: {
                "Authorization": "Bearer " + token,
                "Accept": "application/json"
            },
            data: {
                "\$filter": "substringof('" + i18next.t('log.top', { name: ' ' }).trim() + "', action_detail)",
                "\$orderby": "__updated desc",
                "\$skip": 1,
                "\$top": 1
            }
        })
        .done(function (res) {
            $('.new').removeClass('new');
            userInfo.lastAction = res.d.results[0] ? res.d.results[0].__updated : moment(0);
            for (let article of articleListAll) {
                if (article.__updated > userInfo.lastAction) {
                    $('#img_' + article.__id).parents('.list-image').addClass('new');
                    $('#join_' + article.__id).parents('#top .top-content').addClass('new');
                }
            }
        });
    });
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
                    '\$top': REPLY_LIST_NUM
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
                    $('#articleDetail .evaluation').css('display', '');
                } else {
                    $('#articleDetail .evaluation').css('display', 'none');
                }

                link = $('<a></a>').attr('href', article.url);
                link.text(article.url);

                var venue = article.venue ? i18next.t('articleItem.venue') + ': ' + article.venue : '';

                var img = $('<img>').attr('src', article.previewImg).addClass('thumbnail');

                $('#articleDetail .news-title').html(article.title);
                $('#articleDetail .news-url').html(link);
                $('#articleDetail .news-venue').html(venue);
                $('#articleDetail .news-date').html(term);
                $('#articleDetail .news-text').html(article.detail);

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
                    $('#articleDetail .top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + getImage + "')").css('background-size', 'cover');
                }, this);
                reader.readAsArrayBuffer(image[0]);

                $('#articleDetail .evaluation')[0].style.display = article.type == TYPE.EVENT ? '' : 'none';
                if (article.type == TYPE.EVENT) {

                    var replys = reply[0].d.results;
                    var join = 0, consider = 0;
                    for (reply of replys) {
                        switch (reply.entry_flag) {
                            case REPLY.JOIN: join++; break;
                            case REPLY.CONSIDER: consider++; break;
                        }
                    }
                    $('#joinNum').html(join);
                    $('#considerNum').html(consider);
                    $('#join_' + article.__id + '>.join').html(join);
                    $('#join_' + article.__id + '>.consider').html(consider);

                    $('#joinNum').attr('href', "javascript:viewJoinConsiderList(" + REPLY.JOIN + ", '" + article.__id + "')");
                    $('#considerNum').attr('href', "javascript:viewJoinConsiderList(" + REPLY.CONSIDER + ", '" + article.__id + "')");

                    // get reply information
                    getCurrentCellToken(function (currentToken) {
                        let boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';
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
                                    '\$top': REPLY_LIST_NUM
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
                                    "\$filter": "provide_id eq '" + article.__id + "' and user_cell_url eq '" + cellUrl + "'"
                                }
                            })
                        )
                        .done(function (res1, res2) {
                            var userCell = res1[0].d ? res1[0].d.results[0] : null;
                            var orgCell = res2[0].d ? res2[0].d.results[0] : null;
                            if (userCell && orgCell) {
                                updateReplyLink(userCell.entry_flag, article.__id, userCell.__id, orgCell.__id);
                            } else {
                                $('#joinEventBtn').attr('onclick', "openSendReplyModal(" + REPLY.JOIN + ", '" + article.__id + "')");
                                $('#considerEventBtn').attr('onclick', "javascript:openSendReplyModal(" + REPLY.CONSIDER + ", '" + article.__id + "')");
                                $('#joinEventBtn').removeClass('clicked');
                                $('#considerEventBtn').removeClass('clicked');
                            }
                        })
                        .fail(function () {
                            showMessage('error: get reply information');
                        });
                    });

                    viewArticleDetail();
                } else {
                    viewArticleDetail();
                    $("#main_footer").show();
                    $("#article_footer").hide();
                }


            })
            .fail(function () {
                showMessage('failed to get article detail\n\n' + err.join('\n'));
            });
    }, id);
}

function addLinkToGrid() {
    $('[data-href]').addClass('clickable').click(function () {
        window.location = $(this).attr('data-href');
    }).find('a').hover(function () {
        $(this).parents('div').unbind('click');
    }, function () {
        $(this).parents('div').click(function () {
            window.location = $(this).attr('data-href');
        });
    });
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

    getExtCellToken(function (token) {
        var err = [];
        var anonymous = $('[name=checkAnonymous]').prop('checked');
        var boxUrl = helpAuthorized ? operationCellUrl + APP_BOX_NAME + '/' : Common.getCellUrl() + APP_BOX_NAME + '/';
        var userCellUrl = helpAuthorized ? operationCellUrl : Common.getCellUrl();

        getCurrentCellToken(function (currentToken) {
            var saveToUserCell = function () {
                var method = 'POST';
                var url = boxUrl + oData + '/' + entityType;
                if (userReplyId) {
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
                        'user_cell_url': userCellUrl,
                        'provide_id': articleId,
                        'entry_flag': reply,
                        'anonymous': anonymous
                    })
                })
                    .then(
                        function (res) {
                            return userReplyId || res;
                        },
                        function (XMLHttpRequest, textStatus, errorThrown) {
                            err.push(XMLHttpRequest.status + ' ' + textStatus + ' ' + errorThrown);
                        }
                    );
            };

            var saveToOrganizationCell = function (res) {
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
                        "Authorization": "Bearer " + token
                    },
                    data: JSON.stringify({
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
                            if (!userReplyId) {
                                $.ajax({
                                    type: 'DELETE',
                                    url: boxUrl + oData + '/' + entityType + "('" + id + "')",
                                    headers: {
                                        'Authorization': 'Bearer ' + currentToken
                                    }
                                })
                                    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
                                        showMessage('delete failed');
                                    })
                                    .done(function () {
                                        showMessage('delete done');
                                    });
                            } else {
                                $.ajax({
                                    type: 'PUT',
                                    url: boxUrl + oData + '/' + entityType + "('" + id + "')",
                                    headers: {
                                        'Authorization': 'Bearer ' + currentToken
                                    },
                                    data: JSON.stringify({
                                        'provide_id': articleId,
                                        'entry_flag': reply == REPLY.JOIN ? REPLY.CONSIDER : REPLY.JOIN
                                    })
                                })
                                    .fail(function (XMLHttpRequest, textStatus, errorThrown) {
                                        showMessage('change failed');
                                    })
                                    .done(function () {
                                        showMessage('change done');
                                    });
                            }

                            return Promise.reject();
                        }
                    );
            };

            saveToUserCell().then(saveToOrganizationCell)
                .fail(function () {
                    showMessage(i18next.t('msg.failedReply'));
                })
                .done(function (res) {
                    var userId = userReplyId || res.d.results.user_reply_id;
                    var orgId = orgReplyId || res.d.results.__id;
                    updateReplyLink(reply, articleId, userId, orgId);

                    var join = $('#joinNum').html();
                    var consider = $('#considerNum').html();
                    var replyStr;
                    if (reply == REPLY.JOIN) {
                        replyStr = i18next.t('reply.join');
                        if (!userReplyId) {
                            join++;
                        } else if (!sameReply) {
                            join++;
                            consider--;
                        }
                    } else {
                        replyStr = i18next.t('reply.consider');
                        if (!userReplyId) {
                            consider++;
                        } else if (!sameReply) {
                            consider++;
                            join--;
                        }
                    }
                    $('#joinNum').html(join);
                    $('#considerNum').html(consider);
                    $('#join_' + articleId + '>.join').html(join);
                    $('#join_' + articleId + '>.consider').html(consider);
                    disableEntryListLink();

                    actionHistory.logWrite('editReplyHistory', {detail: $('#articleDetail .news-title').text(), reply: replyStr});
                    showMessage(i18next.t('msg.completeReply'));
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
function updateReplyLink(reply, articleId, userReplyId, orgReplyId) {
    var argJoin = '';
    var argConsider = '';
    switch (reply) {
        case REPLY.JOIN:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', true";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', false";
            $('#joinEventBtn').addClass('clicked');
            $('#considerEventBtn').removeClass('clicked');
            break;

        case REPLY.CONSIDER:
            argJoin += REPLY.JOIN + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', false";
            argConsider += REPLY.CONSIDER + ",'" + articleId + "', '" + userReplyId + "', '" + orgReplyId + "', true";
            $('#joinEventBtn').removeClass('clicked');
            $('#considerEventBtn').addClass('clicked');
            break;

        default:
            // data is not exist
            showMessage('error: read reply information');
            break;
    }

    $('#joinEventBtn').attr('onclick', "openSendReplyModal(" + argJoin + ")");
    $('#considerEventBtn').attr('onclick', "openSendReplyModal(" + argConsider + ")");
}

function openSendReplyModal(reply, articleId, userReplyId, orgReplyId, sameReply) {
    var arg = reply + ",'" + articleId + "'";
    if (userReplyId && orgReplyId) {
            arg += ", '" + userReplyId + "', '" + orgReplyId + "'";
        }
    arg += "," + sameReply;

    $('#sendReplyButton').attr('onclick', 'replyEvent(' + arg + ')');

    var title;
    if (reply === REPLY.JOIN) {
        title = "msg.join";
        msg = 'reply.join';
    } else {
        title = "msg.consider";
        msg = 'reply.consider';
    }
    $('#confirmSendReplyMessage').html(i18next.t('msg.confirmSendReply', {reply: i18next.t(msg)}));
    $('#modal-sendReply').actionHistoryShowModal({ detail: i18next.t(title) });
}

function disableEntryListLink() {
    $('#articleDetail .evaluation .disabled').removeClass('disabled');

    if ($('#considerNum').text() == 0) $('#considerNum').addClass('disabled');
    if ($('#joinNum').text() == 0) $('#joinNum').addClass('disabled');
}
