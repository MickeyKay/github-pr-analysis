// Config
const USERS_TO_ANALYZE = [];

const fs = require('fs');
const { exec } = require("child_process");

const dataDir = './data/';
const analysisOutputFile = './analysis.csv';
const prDataOutputFile = './pr-data.json';

fs.unlink(analysisOutputFile, () => {});
fs.unlink(prDataOutputFile, () => {});

let pullRequests = [];

fs.readdir(dataDir, (err, files) => {
  files.forEach(file => {

    // Skip system/non-JSON files.
    if (file.indexOf('.json') == -1) {
      return;
    }

    let data = require(`${process.cwd()}/${dataDir}/${file}`);
    pullRequests = [...pullRequests, ...data.data.search.edges];
  });

  let reviewers = {};

  const initializeReviewer = (reviewer) => {
      if (!reviewers[reviewer]) {
          reviewers[reviewer] = {
              comments: 0,
              commentWordCount: 0,
              prsAuthored: new Set(),
              prsReviewed: new Set(),
              prsReviewedWithComment: new Set(),
          };
      }
  };

  const logComment = (reviewer, comment, prNumber) => {
    initializeReviewer(reviewer);
    reviewers[reviewer].comments += 1;
    reviewers[reviewer].commentWordCount += comment.body.split(' ').length;
    reviewers[reviewer].prsReviewed.add(prNumber);
    reviewers[reviewer].prsReviewedWithComment.add(prNumber);
  };

  const logPrAuthored = (reviewer, prNumber) => {
    initializeReviewer(reviewer);
    reviewers[reviewer].prsAuthored.add(prNumber);
  };

  pullRequests.forEach(
      (pullRequest) => {
          const { author, comments, reviews, number } = pullRequest.node;
          const prAuthor = author.login;

          logPrAuthored(prAuthor, number);

          comments.nodes.forEach((comment) => {
              const commentAuthor = comment.author.login;
              if (commentAuthor !== prAuthor) {
                  logComment(commentAuthor, comment, number);
              }
          });
          reviews.nodes.forEach((review) => {
              reviewAuthor = review.author.login;

              // Increment review.
              if (reviewAuthor !== prAuthor) {
                initializeReviewer(reviewAuthor);
                reviewers[reviewAuthor].prsReviewed.add(number);
              }

              // Add comments.
              review.comments.nodes.forEach((comment) => {
                  const reviewCommentAuthor = comment.author.login;
                  if (reviewCommentAuthor !== prAuthor) {
                      logComment(reviewCommentAuthor, comment, number);
                  }
              });
          });
      }
  );

  if (USERS_TO_ANALYZE.length) {
    reviewers = Object.keys(reviewers)
      .filter(reviewer => USERS_TO_ANALYZE.includes(reviewer))
      .reduce((obj, key) => {
        obj[key] = reviewers[key];
        return obj;
      }, {});
  }

  fs.appendFileSync(
      prDataOutputFile,
      JSON.stringify(pullRequests, null, 2)
  );

  fs.appendFileSync(
      analysisOutputFile,
      'Reviewer,PRs Authored, PRs reviewed,PRs reviewed with comment, % of reviews with comment, Comments per PR,Words per comment\n'
  );
  Object.keys(reviewers).forEach((reviewer) => {
      reviewers[reviewer].prsAuthored = reviewers[reviewer].prsAuthored.size;
      reviewers[reviewer].prsReviewed = reviewers[reviewer].prsReviewed.size;
      reviewers[reviewer].prsReviewedWithComment = reviewers[reviewer].prsReviewedWithComment.size;
      const { prsAuthored, prsReviewed, prsReviewedWithComment, comments, commentWordCount } = reviewers[reviewer];

      reviewers[reviewer].averageWordsPerComment =
          Math.round((commentWordCount / comments) * 10) / 10;
      if (prsReviewed) {
          reviewers[reviewer].averageCommentsPerReview =
              Math.round((comments / prsReviewed) * 10) / 10;
      }

      const reviewsWithCommentPercent = Math.round(prsReviewedWithComment / prsReviewed * 100);

      fs.appendFileSync(
          analysisOutputFile,
          `${reviewer},${prsAuthored},${prsReviewed},${prsReviewedWithComment},${reviewsWithCommentPercent}%, ${reviewers[reviewer].averageCommentsPerReview},${reviewers[reviewer].averageWordsPerComment}\n`
      );
  });
  console.log(`Total PRs analyzed: ${pullRequests.length}`)
  console.log(`Exported results to ${analysisOutputFile}`);

  exec(`cat ${analysisOutputFile} | sed -e 's/,,/, ,/g' | column -s, -t | less -#5 -N -S`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`\n${stdout}`);
});

});