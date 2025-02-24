const plimit = require("p-limit");
const https = require("https");
const cliProgress = require('cli-progress');

const { getProjectIds, getScanDetails, generateExcel } = require("./utils");

const limit = plimit(2);

module.exports = async (answers) => {
    let { password, url, projectid } = answers;

    //TODO: validate answers once at the beginning, such as url vaidation, projectid validation, etc.

    projectid = projectid.split(",").map((id) => parseInt(id));

    console.log("Issue Reports:", projectid);
}