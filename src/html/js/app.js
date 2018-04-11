const TYPE = {
    INFO: 0,
    EVENT: 1
};

const SEX = {
    ALL: 0,
    MALE: 1,
    FEMALE: 2
};

const AGE = {
    ALL: 0,
    OVER_EIGHTY: 1,
    SEVENTY: 2,
    SIXTY: 3,
    UNDER_FIFTY: 4
};

const REPLY = {
    CONSIDER: 0,
    JOIN: 1
};

Object.freeze(TYPE);
Object.freeze(SEX);
Object.freeze(AGE);
Object.freeze(REPLY);

const MIN_PASS_LENGTH = 8;
const MAX_PASS_LENGTH = 32;

const REPLY_COUNT = 10000;
const REPLY_LIST_NUM = 1000;
const ARTICLE_NUM = 200;
const ARTICLE_SKIP_NUM = 50;

const APP_URL = "https://demo.personium.io/app-life-enrichers-community/";
const APP_BOX_NAME = 'io_personium_demo_app-life-enrichers-community';

var organization_cell_url = sessionStorage.organizationCellUrl || null;
var organization_cell_urls;

additionalCallback = function () {
    switchAppUrl();
};

async function switchAppUrl() {
    let cellUrl = Common.getCellUrl();
    let token = Common.getToken();

    await getOrganizationCellUrls();
    $.ajax({
        type: "GET",
        url: cellUrl + "__ctl/Account",
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json'
        }
    }).done($.proxy(function (data, textStatus, request) {
        $.ajax({
            type: "GET",
            url: cellUrl + "__ctl/Account(Name='" + data.d.results[0].Name + "')/$links/_Role",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/json'
            }
        }).done(function (data2, textStatus2, request2) {
            for(let key in organization_cell_urls) {
                // var appCellName = Common.getAppCellUrl().split("/")[3];
                var appCellName = key;
                var reg = new RegExp("Name=\'(.*)\',\_Box\.Name=\'" + appCellName + "\'");
                var supportRole = _.find(data2.d.results, $.proxy(function (d) {
                    var matchword = d.uri.match(reg);
                    if (matchword !== null) {
                        return matchword[1] === "organization";
                    }
                    return false;
                }, this));
                if (supportRole !== undefined) {
                    $("#supporter_" + key).show();
                }
                $("#user_" + key).show();
                $("#user2_" + key).show();
            }
        }).fail(function () {
            console.log("fail");
        });
    }, this))
        .fail(function (error) {
            console.log("fail");
        });
}

async function getOrganizationCellUrls() {
    $.ajax({
        type: 'GET',
        url: Common.getBoxUrl() + 'organizationCellUrls.json',
        headers: {
            'Authorization': 'Bearer ' + Common.getToken(),
            'Accept': 'application/json'
        }
    }).done(res => {
        organization_cell_urls = res;
        for (let key in organization_cell_urls) {
            let supporterBtn = '<a class="btn btn-primary btn-block" id="supporter_' + key + '" style="display:none" href="javascript:supporter(\'' + key + '\')">' + key +  ' (Community Manager Application)' + '</a><br>';
            let userBtn = '<a class="btn btn-primary btn-block" id="user2_' + key + '" style="display:none" href="javascript:user2(\'' + key + '\')">' + key + ' (Life Enrichers Application)' + '</a><br>';
            $('#selectApplication').append(supporterBtn);
            $('#selectApplication').append(userBtn);
        }
    })
}

function supporter(organizationCellName) {
    sessionStorage.organizationCellUrl = organization_cell_urls[organizationCellName];
    location.href = './supporter/index.html' + location.hash;
}

function user(organizationCellName) {
    organization_cell_url = organization_cell_urls[organizationCellName];
    location.href = './user/index.html' + location.hash;
}

function user2(organizationCellName) {
    sessionStorage.organizationCellUrl = organization_cell_urls[organizationCellName];
    location.href = './user/index2.html' + location.hash;
}

getNamesapces = function () {
    return ['common', 'glossary'];
};

getEngineEndPoint = function () {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};
