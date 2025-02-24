const inquirer = require("inquirer");
const axios = require("axios");
const clear = require("clear");
const version = require("../package.json").version;
const reporter = require("./reporter");
const scanReports = require("./scanReports");
const issueReports = require("./issueReports");
const pageReports = require("./pageReports");
// const exportIssues = require("./exportIssues");
const { el } = require("date-fns/locale");

clear();

const date = new Date();
const _month = date.getMonth() + 1;
const month = _month < 10 ? `0${_month}` : _month;
const year = date.getFullYear();

console.log("\nMonitor Utility \nVersion: " + version);

inquirer
  .prompt([
    {
      type: "input",
      name: "url",
      message:
        "Enter your Axe Monitor URL (example: https://example-axemonitor.dequecloud.com):",
      validate: (input) => {
        return new Promise((resolve, reject) => {
          if (
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/.test(
              input
            )
          ) {
            resolve(true);
          }
          reject("Incorrect URL format");
        });
      },
      default: "https://dev-rocky.dequemonitordev.com/monitor-public-api",
    },
    {
      type: "input",
      name: "username",
      message: "Enter your Axe Monitor email address:",
      default: "jaiprakash.rai@deque.com",
    },
    {
      type: "password",
      name: "password",
      message: "Enter your Axe Monitor bearer token:",
      default: "",
    },
    {
      type: "list",
      name: "path",
      message: "What are you trying to do today?",
      choices: [
        {
          name: "projects",
          value: "projects",
          description: "Export scans data",
        },
        {
          name: "pages",
          value: "pages",
          description: "Export all of the pages scanned from a specific project.",
        },
        {
          name: "issues",
          value: "issues",
          description: "Export all of the issues from a specific project or All projects.",
        },
      ],
    },
    {
      type: "list",
      name: "reportType",
      message: "Individual projects or all projects?",
      when: (answers) => {
        if (answers.path === "projects") {
          return true;
        }
      },
      choices: [
        {
          name: "All projects",
          value: "all-projects",
          description: "Export all of the projects data.",
        },
        {
          name: "Individual projects",
          value: "individual-projects",
          description: "Export scans data for individual projects.",
        },
      ],
    },
    {
      type: "input",
      name: "projectid",
      message:
        "List all Project Id(s) you'd like to export, separated by a comma (i.e. 24,15,215). Project Id can be found in your Axe Monitor URL (Example URL https://axemonitor.dequecloud.com/worldspace/organizationProject/summary/544 with 544 being the Project ID).",
      when: (answers) => {
        if (answers.path === "issues" || answers.path === "pages") {
          return true;
        }
      },
    },
  ])
  .then((answers) => {
    axios.defaults.headers.common["X-API-Key"] = answers.password;
    
    if (answers.path === "issues" || answers.path === "pages") {
      console.log("Answers", answers);
      if (answers.path === "issues") {
        issueReports(answers);
      }else {
        pageReports(answers);
      }
    } else {
      console.log(`
        --------------------------------------------------
        All projects you have acccess to will 
        be reported in this tool. This may take 
        a few minutes.
        --------------------------------------------------
      `);

      scanReports(answers);
    }
  })
  .catch((error) => {
    console.error(error);
  });
