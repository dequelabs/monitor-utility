const axios = require("axios");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

module.exports = (url, username, password) => {
  const data = {
    url: `${url}/worldspace/organizationprojects`,
    method: "get",
    params: {
      limit: 15000,
    },
    auth: {
      username,
      password,
    },
  };

  return new Promise((resolve, reject) => {
    const regex =
      /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;

    if (!regex.test(url)) {
      reject(`Invalid URL: ${url}`);
    }

    return axios(data, { httpsAgent: agent })
      .then((response) => {
        resolve(response.data.projects);
      })
      .catch((error) => {
        console.error(
          `Error: Could not get some projects for you on ${url} ${error}`
        );
      });
  });
};
