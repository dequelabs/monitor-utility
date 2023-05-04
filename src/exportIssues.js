const axios = require("axios");
const { count } = require("console");
const https = require("https");
var fs = require("fs");
function correctDataForURL(issues, pageList) {
  for (var i = 0; i < issues.length; i++) {
    let relevantPage = pageList.find(
      (x) => x.page_id === issues[i]["page"]["id"]
    );
    if (relevantPage?.url) {
      issues[i].url = relevantPage.url;
    }
  }
  return issues;
}
async function getPages(data, agent) {
  let results = await axios(data, { httpsAgent: agent })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error(
        `Error: Could not get some projects for you on ${url} ${error}`
      );
    });
  return results.data.pageList;
}
// Iteratively get all issues for the relevant project in increments of 15000
async function getIssues(data, agent) {
  const url = data.url;
  // Used for accessing Axe Monitor'

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
    console.log(`Iteration ${offsetMultipler}: found ${countOfIssues} issues`);
    offsetMultipler += 1;
  }
  return totalIssues;
}

// Iterate over the array of flattened objects to convert them to a CSV.
function convertJsonArrayToCSV(arr) {
  if (!arr || !arr.length) {
    return;
  }
  const separator = ",";
  let keys = "";
  // We do arr[1] because arr[0] keys are modified
  keys = Object.keys(arr[1]);
  // Add nessecary headers for side table.

  // CSV Generation from https://codeburst.io/export-objects-array-as-csv-using-typescript-643bf4f794d9
  const csvContent =
    keys.join(separator) +
    "\n" +
    arr
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? "" : row[k];
            cell =
              cell instanceof Date
                ? cell.toLocaleString()
                : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join("\n");
  return csvContent;
}
// Flatten a singular JSON object
function flattenJSON(obj = {}, res = {}, extraKey = "") {
  for (key in obj) {
    if (typeof obj[key] !== "object") {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    }
  }
  return res;
}
// Write all of the gathered issues to a JSON file and a CSV file.
async function writeIssues(issues, projectid) {
  var json = JSON.stringify(issues);

  fs.writeFile(`issues-${projectid}.json`, json, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`issues-${projectid}.json has been created`);
  });

  // Flatten the array of issues.
  console.log(`Flattening data for project ${projectid}...`);
  for (var i = 0; i < issues.length; i++) {
    issues[i] = flattenJSON(issues[i]);
  }
  let csv = convertJsonArrayToCSV(issues);
  fs.writeFile(`issues-${projectid}.csv`, csv, "utf-8", (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`issues-${projectid}.csv has been created`);
  });
}
module.exports = async (answers) => {
  // Extract the credentials and data passed to inquirer
  let url = answers.url;
  let username = answers.username;
  let password = answers.password;
  let projectids = answers.projectid.replaceAll(" ", "");
  projectids = projectids.split(",");

  for (var projectid of projectids) {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    const pageData = {
      url: `${url}/worldspace/pages/byProject?projectId=${projectid}`,
      method: "get",
      auth: {
        username,
        password,
      },
    };
    const data = {
      url: `${url}/worldspace/issues/${projectid}`,
      method: "get",
      params: {
        pageSize: 15000,
      },
      auth: {
        username,
        password,
      },
    };
    let pageList = await getPages(pageData, agent);
    // Get all issues for the relevent project with the specified id
    console.log(`Getting all issues for project ${projectid}...`);

    let issues = await getIssues(data, agent);

    // Update issues with correct URL
    console.log(`Correcting data for project ${projectid}...`);
    issues = correctDataForURL(issues, pageList);
    // Write the issues to files
    console.log(`Preparing to ouput data for project ${projectid}...`);

    writeIssues(issues, projectid);
  }
};
