const axios = require("axios");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

module.exports = (url, username, password) => {
  const data = {
    url: `${url}/v1/scans`,
    method: "get",
    params: {
      limit: 15000,
    },
    headers: {
      Authorization: `Bearer ${password}`,
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
        axios.defaults.headers.common['Authorization'] = `Bearer ${password}`;
        // const JSESSIONID = response.headers['set-cookie'][0].split(';')[0].split('=')[1];
        // console.log('JSESSIONID is ', JSESSIONID);
        // axios.defaults.headers.common['Cookie'] = `JSESSIONID=${JSESSIONID}`;
        console.log("Getting projects for you...");
        console.log("----->",response.data.scans);
        resolve(response.data.scans);
      })
      .catch((error) => {
        console.error(
          `Error: Could not get some projects for you on ${url} ${error}`,
        );
      });
  });
};
