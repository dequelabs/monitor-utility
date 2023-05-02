const axios = require("axios");
const { count } = require("console");
const https = require("https");
var fs = require("fs");
const agent = new https.Agent({
  rejectUnauthorized: false,
});
async function getIssues(data) {
  let totalIssues = [];
  let countOfIssues = 15000;
  let offsetMultipler = 0;
  while (countOfIssues == 15000) {
    data.params.offSet = 15000 * offsetMultipler;
    let results = await axios(data, { httpsAgent: agent })
      .then((response) => {
        return response;
      })
      .catch((error) => {
        console.error(
          `Error: Could not get some projects for you on ${url} ${error}`
        );
      });
    totalIssues.push(...results.data.issues);
    countOfIssues = results.data.issues.length;
    offsetMultipler += 1;
  }
  return totalIssues;
}
async function writeIssues(issues) {
  var json = JSON.stringify(issues);

  fs.writeFile("issues.json", json, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("File has been created");
  });
}
module.exports = async (answers) => {
  let url = answers.url;
  let username = answers.username;
  let password = answers.password;
  let pageIds = [answers.projectid];
  const data = {
    url: `${url}/worldspace/issues/${answers.projectid}`,
    method: "get",
    params: {
      pageSize: 15000,
    },
    auth: {
      username,
      password,
    },
  };
  let issues = await getIssues(data);
  writeIssues(issues);
};
