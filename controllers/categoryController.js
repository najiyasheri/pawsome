const Category=require('../models/Category')



const addCategory=async(req,res)=>{
    try{
        
        const{name,description}=req.body
        console.log(name,description)
        const isExists=await Category.findOne({name})
        if(isExists){
            return res.render('admin/categoryManagement',{
                error:'Category already Exists',title:'Category-Management',layout: "layouts/adminLayout"
            })
        }
    const newCategory=new Category({name,description})
    await newCategory.save() 
    return res.redirect('/admin/category')
    }
    
    catch(error){
    console.error("error for save Category", error);
    res.status(500).send("internal server error");
  }
    }

const getCategory=async(req,res)=>{
    try{
        let page=parseInt(req.query.page)||1
        const limit=3

        const categories=await Category.find({})
        .sort({createdAt:-1})
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()
        const count=await Category.countDocuments()
        const totalPages=Math.ceil(count/limit)
        return res.render('admin/categoryManagement',{title:'Category-Management',layout: "layouts/adminLayout",categories ,limit,totalPages,currentPage:page})
    }

    catch(error){
        console.error('error for fetching category')
    }
}


module.exports={
    getCategory,
    addCategory
}