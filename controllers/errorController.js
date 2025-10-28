

const pageNotFound = (req, res) => {
  if(req.session.user && req.session.user.isAdmin) {
     res.status(404).render("error/404Admin", {
       title: "404 - Page Not Found",
       message: "The page you’re looking for doesn’t exist.",
     });
  } else {
    res.status(404).render("error/404", {
      title: "404 - Page Not Found",
      message: "The page you’re looking for doesn’t exist.",
    });
  }
};

module.exports={pageNotFound}
