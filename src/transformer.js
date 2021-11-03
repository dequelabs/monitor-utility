const sha1 = require("sha1");

const calculateScore = (scoreObject) => {
  const { minor, moderate, serious, critical, total } = scoreObject;
  if (minor == "0" && moderate == "0" && serious == "0" && critical == "0") {
    return "100";
  }
  return (
    (40 * parseInt(serious, 10) +
      80 * parseInt(moderate, 10) +
      100 * parseInt(minor, 10)) /
    parseInt(total, 10)
  ).toFixed(3);
};

module.exports = {
  report: async (results) => {
    return new Promise((resolve) => {
      const transformedResults = [];

      results.forEach((result) => {
        const xor = "&*^%RJCTJF B#W($AU)O(SD D";
        const pid = result.report.report.id;
        const shareHash = sha1(`${pid}${xor}`);
        const shareUrl = `${result.server}/worldspace/organizationProject/summary/${pid}?share=${shareHash}`;

        const getTotal = (group) => {
          let issues = 0;
          result.report.report.issuelist.forEach((issue) => {
            if (!group) {
              issues = issues + issue.issues;
            } else if (issue.issuegrouping === group) {
              issues = issues + issue.issues;
            }
          });
          return issues;
        };

        transformedResults.push({
          Site: result.report.report.name,
          "Shared Report URL": shareUrl,
          "Total Pages": result.report.report.totalPages,
          "Total Issues": getTotal(),
          "Raw Data %": calculateScore({
            minor: result.report.report.good.toString(),
            moderate: result.report.report.fair.toString(),
            serious: result.report.report.serious.toString(),
            critical: result.report.report.critical.toString(),
            total: result.report.report.totalPages.toString(),
          }),
          ARIA: getTotal("Aria"),
          Color: getTotal("Color"),
          Forms: getTotal("Forms"),
          Keyboard: getTotal("Keyboard"),
          Language: getTotal("Language"),
          Media: getTotal("Media"),
          "Name Role Value": getTotal("Name Role Value"),
          Parsing: getTotal("Parsing"),
          PDF: getTotal("PDF"),
          Semantics: getTotal("Semantics"),
          "Sensory and Visual Cues": getTotal("Sensory And Visual Cues"),
          Structure: getTotal("Structure"),
          Tables: getTotal("Tables"),
          "Text Alternatives": getTotal("Text Alternatives"),
          Time: getTotal("Time"),
        });
      });

      resolve(transformedResults);
    });
  },
};
