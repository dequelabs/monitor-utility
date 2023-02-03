const inquirer = require("inquirer");
const clear = require("clear");
const version = require("../package.json").version;
const reporter = require("./reporter");

clear();

const date = new Date();
const _month = date.getMonth() + 1;
const month = _month < 10 ? `0${_month}` : _month;
const year = date.getFullYear();

console.log("\nMonitor Reporter CLI\nVersion: " + version);

console.log(`
--------------------------------------------------
Only projects you have marked as a "favorite" will
be reported in this tool. You can un/mark projects
as a "favorite" to include or exclude them.
--------------------------------------------------
`);

inquirer
  .prompt([
    {
      type: "input",
      name: "url",
      message: "Enter Axe Monitor URL (do not add anything after .com):",
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
      type: "confirm",
      name: "limit",
      message: "Limit to specific month?",
      default: true,
    },
    {
      type: "input",
      name: "date",
      message: "Enter MM/YYYY to limit report:",
      default: `${month}/${year}`,
      validate: (input) => {
        return new Promise((resolve, reject) => {
          if (/^(0?[1-9]|1[012])[\/\-]\d{4}$/.test(input)) {
            resolve(true);
          }
          reject("Incorrect date format");
        });
      },
      when: (answers) => answers.limit,
    },
  ])
  .then((answers) => {
    reporter(answers);
  })
  .catch((error) => {
    console.log(error);
  });
