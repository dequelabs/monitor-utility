const ProjectIDsPerRequest = 100;
const ProjectsMetaPerRequest = 1; // Fetch only the latest run for each project because we are only interested in the latest scan results
const PagesPerRequest = 100;
const IssuesPerRequest = 100;

//export above constants
module.exports = {
  ProjectIDsPerRequest,
  ProjectsMetaPerRequest,
  PagesPerRequest,
  IssuesPerRequest,
};
