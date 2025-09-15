const Category = require("../models/Category");

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    console.log(name, description);
    const isExists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (isExists) {
      return res.redirect(
        `/admin/category?error=${encodeURIComponent("Category already exists")}`
      );
    }
    const newCategory = new Category({ name, description });
    await newCategory.save();
    return res.redirect("/admin/category?success=Category added successfully");
  } catch (error) {
    console.error("Error saving category:", error);
    return res.redirect(
      `/admin/category?error=${encodeURIComponent("Internal server error")}`
    );
  }
};

const getCategory = async (req, res) => {
  try {
    const error = req.query.error || null;
    const success = req.query.success || null;
    let search = req.query.search || "";
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
      .limit(limit)
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
      error,
      success, 
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.render("admin/categoryManagement", {
      title: "Category-Management",
      layout: "layouts/adminLayout",
      categories: [],
      limit: 3,
      totalPages: 1,
      currentPage: 1,
      search: "",
      error: "Failed to fetch categories",
    });
  }
};

const toggleBlock = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findById(id);
    if (!category) {
      return res.redirect(
        `/admin/category?error=${encodeURIComponent("Category not found")}`
      );
    }
    category.isBlocked = !category.isBlocked;
    await category.save();
 res.json({ success: true, _id: category._id, isBlocked: category.isBlocked });
  } catch (error) {
    console.error("Error toggling category block:", error);
  res.status(500).json({ success: false, error: 'Failed to toggle block status' });
  }
};

const categoryEdit = async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = req.params.id;
    const category = await Category.findById(id);
    if (!category) {
      return res.redirect(
        `/admin/category?error=${encodeURIComponent("Category not found")}`
      );
    }
    const isExists = await Category.findOne({ name, _id: { $ne: id } });
    if (isExists) {
      return res.redirect(
        `/admin/category?error=${encodeURIComponent(
          "Category name already exists"
        )}`
      );
    }
    category.name = name || category.name;
    category.description = description || category.description;
    await category.save();
    return res.redirect(
      "/admin/category?success=Category updated successfully"
    );
  } catch (error) {
    console.error("Error editing category:", error);
    return res.redirect(
      `/admin/category?error=${encodeURIComponent("Failed to update category")}`
    );
  }
};

module.exports = {
  getCategory,
  addCategory,
  toggleBlock,
  categoryEdit,
};
