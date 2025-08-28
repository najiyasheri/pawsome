const loadProductManagement=async(req,res)=>{
    try {
        res.render('admin/productManagement',{title: "Products-Management",
      layout: "layouts/adminLayout"})
    } catch (error) {
        
    }
}

const loadAddProduct=async(req,res)=>{
    try{
               res.render('admin/addProduct',{title: "Products-Management",
      layout: "layouts/adminLayout"})
    }
    catch(error){

    }
}



module.exports={
    loadProductManagement,
    loadAddProduct
}