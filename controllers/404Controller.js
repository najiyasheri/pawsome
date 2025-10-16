const pageNotFound = (req, res) => {
  res.status(404).render("error/404", {
    title: "404 - Page Not Found",
    message: "The page you’re looking for doesn’t exist.",
  });
};

module.exports={pageNotFound}
