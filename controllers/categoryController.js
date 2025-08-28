const Category = require("../models/Category");

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    console.log(name, description);
    const isExists = await Category.findOne({ name });
    if (isExists) {
      return res.render("admin/categoryManagement", {
        error: "Category already Exists",
        title: "Category-Management",
        layout: "layouts/adminLayout",
      });
    }
    const newCategory = new Category({ name, description });
    await newCategory.save();
    return res.redirect("/admin/category");
  } catch (error) {
    console.error("error for save Category", error);
    res.status(500).send("internal server error");
  }
};

const getCategory = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = parseInt(req.query.page) || 1;
    const limit = 3;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await Category.countDocuments(filter);
    const totalPages = Math.ceil(count / limit);
    return res.render("admin/categoryManagement", {
      title: "Category-Management",
      layout: "layouts/adminLayout",
      categories,
      limit,
      totalPages,
      currentPage: page,
      search,
    });
  } catch (error) {
    console.error("error for fetching category");
  }
};
const toggleBlock = async (req, res) => {
  try {
    let id = req.query.id;
    const category = await Category.findById(id);
    if (!category) {
      return res.render("admin/categoryManagement", {
        error: "there is no category",
      });
    }
    category.isBlocked = !category.isBlocked;
    await category.save();
    const search = req.query.search || "";
    const page = req.query.page || 1;

    return res.redirect(`/admin/category?page=${page}&search=${search}`);
  } catch (error) {
    console.error("error for fetching category", error);
  }
};

const categoryEdit = async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = req.params.id;
    const category = await Category.findById(id);
    if (!category) {
      console.log("category with is id not exist", id);

      return res.render("admin/categoryManagement", {
        error: "there is some error occur",
      });
    }
    category.name = name || category.name;
    category.description = description || category.description;

    await category.save();
    return res.redirect('/admin/category')
  } catch (error) {

  }
};

module.exports = {
  getCategory,
  addCategory,
  toggleBlock,
  categoryEdit
};
