const inquirer = require("inquirer");
const clear = require("clear");
const version = require("../package.json").version;
const reporter = require("./reporter");
const exportIssues = require("./exportIssues");
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
              input,
            )
          ) {
            resolve(true);
          }
          reject("Incorrect URL format");
        });
      },
      default: "https://axemonitor.dequecloud.com",
    },
    {
      type: "input",
      name: "username",
      message: "Enter your Axe Monitor email address:",
    },
    {
      type: "password",
      name: "password",
      message: "Enter your Axe Monitor password:",
    },
    {
      type: "list",
      name: "path",
      message: "What are you trying to do today?",
      choices: [
        {
          name: "projects",
          value: "projects",
          description: "Export data about my favorited projects.",
        },
        {
          name: "issues",
          value: "issues",
          description: "Export all of the issues from a specific project.",
        },
      ],
    },
    {
      type: "list",
      name: "reportType",
      message:
        "Individual project issues or Combined issues of multiple projects",
      when: (answers) => {
        if (answers.path === "issues") {
          return true;
        }
      },
      choices: [
        {
          name: "Combined issues of multiple projects",
          value: "combine-project-reports",
          description: "Export all of the issues from different project.",
        },
        {
          name: "Individual project issues",
          value: "individual-issues",
          description: "Export all of the issues from a specific project.",
        },
      ],
    },
  ])
  .then((answers) => {
    if (answers.path === "issues") {
      // Prompt for the project ID and then export all issues.
      inquirer
        .prompt([
          {
            type: "input",
            name: "projectid",
            message:
              "List all Project Id(s) you'd like to export, separated by a comma (i.e. 24,15,215). Project Id can be found in your Axe Monitor URL (Example URL https://axemonitor.dequecloud.com/worldspace/organizationProject/summary/544 with 544 being the Project ID).",
          },
        ])
        .then((answersPartTwo) => {
          answers.projectid = answersPartTwo.projectid;
          exportIssues(answers);
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      console.log(`
--------------------------------------------------
Only projects you have marked as a "favorite" will
be reported in this tool. You can un/mark projects
as a "favorite" to include or exclude them.
--------------------------------------------------
`);
      reporter(answers);
    }
  })
  .catch((error) => {
    console.error(error);
  });
