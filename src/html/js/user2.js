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
var sort_key = 'updated';
var filter = null;
var currentTime = moment();
var operationCellUrl = '';
var userInfo = {};
var helpAuthorized = false;

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
        getUserProfile();
        getArticleList();
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
                    joinList[val.provide_id].personalEntry = val.entry_flag;
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
            let entry =
                '<i class="fa fa-star fa-2x icon"></i>0' +
                ' <i class="fas fa-calendar-check fa-2x icon"></i>0';
            let dispDate = formatDate(article.start_date);
            let topContent =
                '<div class="etc_area">' +
                    '<div class="date">' +
                        dispDate +
                    '</div>' +
                    '<div class="evaluation" id="join_' + article.__id + '">' +
                        (dispDate ? entry : '') +
                    '</div>' +
                '</div>' +
                '<div class="title-area">' +
                    article.title +
                '</div>';
            $('.top-content').html(topContent);
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

function setFilter(key) {
    $('#topInfoList>ul').children().remove();
    $('.top-content').children().remove();
    let first = true;
    for (let article of articleList) {
        if (article.type != key) continue;
        if (first) {
            let entry =
                '<i class="fa fa-star fa-2x icon"></i>0' +
                ' <i class="fas fa-calendar-check fa-2x icon"></i>0';
            let dispDate = formatDate(article.start_date);
            let topContent =
                '<div class="etc_area">' +
                    '<div class="date">' +
                        dispDate +
                    '</div>' +
                    '<div class="evaluation" id="join_' + article.__id + '">' +
                        (dispDate ? entry : '') +
                    '</div>' +
                '</div>' +
                '<div class="title-area">' +
                    article.title +
                '</div>';
            $('.top-content').html(topContent);
            $('.top-content').css('background', "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.5) 100%),url('" + imageList[article.__id] + "')");
        } else {
            $('#topInfoList>ul').append(createArticleGrid(article.__id, article.title, article.start_date, article.type));
            $('#img_' + article.__id).attr('src', imageList[article.__id]);
        }
        first = false;
    }
}

function setPersonalFilter(key) {
    $("#topInfoList>ul>li").hide();
    if (key === REPLY.JOIN) {
        $(".entry" + String(REPLY.JOIN)).show();
    } else {
        $(".entry" + String(REPLY.CONSIDER)).show();
    }
}

function clearFilter() {
    $('#topInfoList>ul').children().show();
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

function getUserProfile() {
    getCurrentCellToken(function (token) {
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
                        '<dt>' + i18next.t('vital.bodyTemp') + ':</dt>' +
                        '<dd>' + vital.temperature + ' &deg;C (' + (tempDiff || '-') + ')' + '</dd>' +
                        '<dt>' + i18next.t('vital.bloodPressure') + ':</dt>' +
                        '<dd>' + i18next.t('vital.max') + ': ' + vital.max_pressure + ' mmHg' + ' (' + (maxDiff || '-') + ')' + '</dd>' +
                        '<dd>' + i18next.t('vital.min') + ': ' + vital.min_pressure + ' mmHg' + ' (' + (minDiff || '-') + ')' + '</dd>' +
                        '<dt>' + i18next.t('vital.pulse') + ':</dt>' +
                        '<dd>' + vital.pulse + ' bpm' + ' (' + (pulseDiff || '-') + ')' + '</dd>' +
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
                var profile =
                    '<tr><th>' + i18next.t('basicInfo.name') + ':</th><td>' + basicInfo.name + '<br>(' + basicInfo.name_kana + ')</td></tr>' +
                    '<tr><th>' + i18next.t('basicInfo.birthday') + ':</th><td>' + basicInfo.birthday + '<br>(' + age + ')</td></tr>' +
                    '<tr><th>' + i18next.t('basicInfo.sex') + ':</th><td>' + basicInfo.name + '</td></tr>' +
                    // '<tr><th>' + i18next.t('basicInfo.bloodType') + ':</th><td>' + basicInfo.bloodType + '</td></tr>' +
                    '<tr><th>' + i18next.t('basicInfo.address') + ':</th><td>' + basicInfo.address + '</td></tr>' +
                    '<tr><th>' + i18next.t('basicInfo.residentType') + ':</th><td>' + household.resident_type + '</td></tr>';
                $('#userProfile').html(profile);

                if (profileJson.Image.length == 0) {
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
            .fail(function () {
                alert('error: get user profile');
            });
    });

}
