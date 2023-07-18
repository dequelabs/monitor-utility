function addSeverityToIssues(issues) {
  for (var issue of issues) {
    if (issue.weight == 0) {
      issue.issuePriority = "Minor";
    } else if (issue.weight == 1) {
      issue.issuePriority = "Moderate";
    } else if (issue.weight == 2) {
      issue.issuePriority = "Serious";
    } else if (issue.weight == 3) {
      issue.issuePriority = "Critical";
    } else if (issue.weight == 4) {
      issue.issuePriority == "Blocker";
    } else {
      issue.issuePriority == "";
    }
  }
  return issues;
}
module.exports = (issues) => {
  // Add text representing the priority of the issues
  issues = addSeverityToIssues(issues);
  return issues;
};
