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

const APP_URL = "https://demo.personium.io/app-life-enrichers-community/";
const APP_BOX_NAME = 'io_personium_demo_app-life-enrichers-community';
const ORGANIZATION_CELL_URL = 'https://demo.personium.io/fst-community-organization/';
