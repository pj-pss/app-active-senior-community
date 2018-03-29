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

const APP_URL = "https://demo.personium.io/app-life-enrichers-community/";
const APP_BOX_NAME = 'io_personium_demo_app-life-enrichers-community';
const ORGANIZATION_CELL_URL = 'https://demo.personium.io/fst-community-organization/';

additionalCallback = function () {
    switchAppUrl();
};

function switchAppUrl() {
    let cellUrl = Common.getCellUrl();
    let token = Common.getToken();

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
            var appCellName = Common.getAppCellUrl().split("/")[3];
            var reg = new RegExp("Name=\'(.*)\',\_Box\.Name=\'" + appCellName + "\'");
            var supportRole = _.find(data2.d.results, $.proxy(function (d) {
                var matchword = d.uri.match(reg);
                if (matchword !== null) {
                    return matchword[1] === "organization";
                }
                return false;
            }, this));
            if (supportRole !== undefined) {
                $("#supporter").show();
            }
            $("#user").show();
        }).fail(function () {
            console.log("fail");
        });
    }, this))
        .fail(function (error) {
            console.log("fail");
        });
}
