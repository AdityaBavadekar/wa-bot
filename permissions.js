import { configDotenv } from "dotenv";
configDotenv();

const ALLOWED_USERS = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(",") : [];
const AI_ACCESS_LEVEL_USERS = process.env.AI_ACCESS_LEVEL_USERS ? process.env.AI_ACCESS_LEVEL_USERS.split(",") : [];
const ENC_DEC_ACCESS_LEVEL_USERS = process.env.ENC_DEC_ACCESS_LEVEL_USERS ? process.env.ENC_DEC_ACCESS_LEVEL_USERS.split(",") : [];

function isAllowedUser(from, accessLevel) {
    if (accessLevel == 1) {
        return ALLOWED_USERS.includes(from);
    }
    if (accessLevel == 2) {
        return AI_ACCESS_LEVEL_USERS.includes(from);
    }
    if (accessLevel == 3) {
        return ENC_DEC_ACCESS_LEVEL_USERS.includes(from);
    }
    return false;
}

const PERMISSIONS = {
    ALL: 1,
    AI_ACCESS: 2,
    ENC_DEC_ACCESS: 3,
};

export { isAllowedUser, PERMISSIONS };
