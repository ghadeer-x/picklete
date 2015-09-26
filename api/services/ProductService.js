import moment from "moment";
import fs from 'fs';
import mime from "mime";
import util from "util";

module.exports = {

  create: async (updateProduct) => {
    // console.log('----------');
    // console.log(updateProduct);
    // console.log('----------');
    let product;

    // 如果選擇其他品牌的話，找出其他品牌的 id
    var brandType = updateProduct.brandType;
    var brandName = updateProduct.customBrand;
    var brandId = updateProduct.brandId;

    if (brandType.toLowerCase() === 'custom') {
      brandId = await db.Brand.findOne({ where: {type: 'OTHER'} });
      brandId = brandId.dataValues.id;
    }

    var tag = updateProduct.tag || '';
    if (tag) {
      tag = tag.split(',');
    }

    let newProductGm = {
      brandId: brandId,
      name: updateProduct.name,
      brandName: brandName,
      explain: updateProduct.explain || "",
      usage: updateProduct.usage || "",
      notice: updateProduct.notice || "",
      tag: tag || [],
      coverPhoto: updateProduct['coverPhoto'] || []
    };
    let createdProductGm;
    // create product gm
    try {

      createdProductGm = await db.ProductGm.create(newProductGm);
      await createdProductGm.setDpts(updateProduct.dptId);
      await createdProductGm.setDptSubs(updateProduct.dptSubId);

      // if(updateProduct.dptSubId != undefined && updateProduct.dptSubId != '')


    } catch (e) {
      console.error(e);
      return;
    }

    if ( !createdProductGm )
      return;

    var goods = updateProduct.good;

    for (var i = 0 ; i < goods.length ; i++) {
      var good = goods[i];
      var productNumber = good.productNumber;

      if ( ! productNumber || productNumber.length < 1) {
        continue;
      }

      var photos = [];
      if (good['photos-1'])
        photos.push(good['photos-1']);

      if (good['photos-2'])
        photos.push(good['photos-2']);

      // product.photos = photos;

      let newProduct = {
        name: good.name || "",
        description: good.description || "",
        stockQuantity: good.stockQuantity || 0,
        isPublish: good.isPublish || false,
        price: updateProduct.price,
        size: updateProduct.size,
        comment: updateProduct.comment,
        service: updateProduct.service,
        country: updateProduct.country,
        madeby: updateProduct.madeby,
        spec: updateProduct.spec,
        color: good.color || 1,
        productNumber: productNumber,
        photos: photos,
        ProductGmId: createdProductGm.id,
        weight: updateProduct.weight || 0
      };

      try {
        product =  await db.Product.create(newProduct);
        return product;
      } catch (e) {
        return console.error(e)
      }
    }

  },

  update: async (updateProduct) => {
    let product;
    // console.log('=== ProductService : updateProduct ==>\n', updateProduct);
    try {
      var {brandType} = updateProduct;
      var brand;
      if (brandType.toLowerCase() === 'other') {
        brand = await db.Brand.findOne({ where: {type: 'OTHER'} });
      } else {
        brand = {id: updateProduct.brandId};
      }

      // console.log('=== updateProduct.tag ==>', updateProduct.tag);
      var tag = updateProduct.tag || '';
      if (tag) {
        tag = tag.split(',');
      }

      // console.log('=== updateProduct.productGm.id ==>', updateProduct.productGm.id);
      let productGm = await db.ProductGm.find({
        where: {
          id: updateProduct.productGm.id
        }
      });

      var goods = updateProduct.good;
      for (var i = 0 ; i < goods.length ; i++) {
        // console.log('=== now deal with good ==>',i);
        var good = goods[i];

        // find product in db first
        product = await db.Product.find({
          where: {
            id: good.id
          }
        });

        // let's check whether we find this product.
        if (product){
          // product is exists.
          // so let's check if user want to remove this product or not.
          if(!good.productNumber){
            // if this product is be deleted at view
            // console.log('=== product ',i,' exists but need to be delete ===');
            let deleteProduct = await product.destroy();
            // check status
            // console.log('=== deleteProduct ',i,' status is ==>',deleteProduct.deletedAt);
          }else{
            // this product is just be updated.
            // console.log('=== product ',i,' exists and name is ==>',good.name);
            product.name = good.name;
            product.price = updateProduct.price;
            product.size = updateProduct.size;
            product.comment = updateProduct.comment;
            product.service = updateProduct.service;
            product.country = updateProduct.country;
            product.madeby = updateProduct.madeby;
            product.spec = updateProduct.spec;
            product.color = good.color;
            product.productNumber = good.productNumber;
            product.stockQuantity = good.stockQuantity;
            product.description = good.description;
            product.isPublish = (good.isPublish == "false") ? false : true;
            product.weight = good.weight || 0;

            let photos = [];
            if (good['photos-1']) photos.push(good['photos-1']);
            if (good['photos-2']) photos.push(good['photos-2']);

            product.photos = photos;

            await product.save();
          } // end if

        }else {
          // product not exists
          // console.log('=== product ',i,' NOT exists and name is ===', good.name);
          let isPublish = (good.isPublish == "false") ? false : true;
          let newProduct = {
            name : good.name,
            price : updateProduct.price,
            size : updateProduct.size,
            comment : updateProduct.comment,
            service : updateProduct.service,
            country : updateProduct.country,
            madeby : updateProduct.madeby,
            spec : updateProduct.spec,
            color : good.color,
            productNumber : good.productNumber,
            stockQuantity : good.stockQuantity,
            description : good.description,
            isPublish : isPublish,
            ProductGmId: productGm.id,
            weight: good.weight || 0
          };

          let photos = [];
          if (good['photos-1']) photos.push(good['photos-1']);
          if (good['photos-2']) photos.push(good['photos-2']);

          newProduct.photos = photos;

          await db.Product.create(newProduct);
        } // end if
      } // end for

      productGm.brandId = brand.id;
      productGm.name = updateProduct.name;
      productGm.dptId = updateProduct.dptId;
      productGm.dptSubId = updateProduct.dptSubId;
      productGm.explain = updateProduct.explain;
      productGm.usage = updateProduct.usage;
      productGm.notice = updateProduct.notice;
      productGm.tag = updateProduct.tag;
      productGm.coverPhoto = updateProduct.coverPhoto;

      await productGm.save();

      if(updateProduct.dptId != null)
        await productGm.setDpts(updateProduct.dptId);

      if(updateProduct.dptSubId != '')
        await productGm.setDptSubs(updateProduct.dptSubId);

      return product;
    } catch (e) {
      console.error(e.stack);
      throw e;
    }
  },

  // delete
  delete: async (productGmId) => {
    try {
      // find products first
      let findProducts = await db.Product.findAll({
        where: {
          ProductGmId: productGmId
        }
      });
      // lets delete all of them.
      if(findProducts.length>0){
        let deleteProducts = await* findProducts.map((product) => {
          product.destroy();
        });
      }
      // delete productGm
      let findProductGm = await db.ProductGm.findById(productGmId);
      if (!findProductGm) {
        throw new Error('找不到商品！ 請確認商品ID！');
      }
      let deleteProductGm = await findProductGm.destroy();
      // finish
      return deleteProductGm;
    } catch (error) {
      console.error(error.stack);
      let msg = error.message;
      return res.serverError({msg});
    }
  },
  // end delete


  findGmWithImages: async (productGmId) => {
    let productGm = await db.ProductGm.find({
      where: {id: productGmId},
      include: [
        {model: db.Product},
        {model: db.Dpt},
        {model: db.DptSub}
      ],
      order: ['Products.weight']
    });
    // console.log(productGm.products);
    return productGm;
  },

  findFavorite: async (productIds) => {

    if ( ! productIds)
      return [];

    var prop;
    let subQuery = { "$or": [] };

    // $or: [{a: 5}, {a: 6}]
    for (prop in productIds) {
      subQuery["$or"].push({id: prop});
    }

    if (subQuery["$or"].length < 1)
      return [];

    let products = await db.Product.findAll({
      where: subQuery,
      include: [{
        model: db.ProductGm,
        include: [
          db.Dpt, db.DptSub
        ]
      }]
    });

    return products;
  },

  findWithImages: async (productId) => {
    let product = await db.Product.find({
      where: {id: productId},
      include: [{
        model: db.ProductGm,
        include: [
          db.Dpt, db.DptSub
        ]
      }]
    });
    // console.log('product', product);

    let productWithImage = ProductService.withImage(product);
    // console.log(product);
    //console.log('productWithImage', productWithImage);
    return productWithImage;
  },

  findAllWithImages: async () => {
    let products = await db.Product.findAll();
    let productsWithImage = products.map(ProductService.withImage);
    return productsWithImage;
  },

  withImage: (product) => {
    let productJson = product.toJSON();

    try {
      let src = `${__dirname}/../../assets/images/product/${product.id}.jpg`;
      let data = fs.readFileSync(src).toString("base64");

      if (data) {
        let base64data = util.format("data:%s;base64,%s", mime.lookup(src), data);
        productJson.image = base64data;
      }
    } catch (error) {
      // console.log("can't find product " + product.id + " image");
      productJson.image = 'about:blank';
    }

    return productJson;
  },

  productQuery: async (query, offset = 0, limit = 2000) => {
    let queryObj = {},
        queryGmObj = {},
        resultProducts;

    try {
      if (Object.keys(query).length > 0) {
        // search condition
        if (query.price) {
          queryObj.price = query.price;
        }

        if (query.productNumber) {
          queryObj.productNumber = query.productNumber;
        }
        // 存貨數量搜尋條件
        if (query.stockQuantityStart && query.stockQuantityEnd) {
          queryObj.stockQuantity = {
            $between: [query.stockQuantityStart, query.stockQuantityEnd]
          };
        } else if (query.stockQuantityStart || query.stockQuantityEnd) {
          queryObj.stockQuantity = query.stockQuantityStart ? {
            $gte: query.stockQuantityStart
          } : {
            $lte: query.stockQuantityEnd
          };
        }
        // 日期搜尋條件
        if (query.dateFrom && query.dateEnd) {
          queryObj.createdAt = {
            $between: [new Date(query.dateFrom), new Date(query.dateEnd)]
          };
        } else if (query.dateFrom || query.dateEnd) {
          queryObj.createdAt = query.dateFrom ? {
            $gte: new Date(query.dateFrom)
          } : {
            $lte: new Date(query.dateEnd)
          };
        }

        // 販售狀態 1:隱藏, 2:上架
        if (query.isPublish != '') {
          queryObj.isPublish = (query.isPublish == 'false') ? null : true;
        }

        // productGm 搜尋
        if (query.brandId > 0)
          queryGmObj.brandId = query.brandId;

        // tag keyword search
        if (query.tag) {
          queryGmObj.tag = {
            $like: '%' + query.tag + '%'
          };
        }
      }

      // execute query
      queryObj = {
        where: queryObj,
        include: [db.ProductGm]
      };

      let products = await db.Product.findAll(queryObj);

      queryGmObj = {
        where: queryGmObj,
        include: [db.Product, db.Dpt, db.DptSub]
      };
      let productGms = await db.ProductGm.findAll(queryGmObj);

      // 過濾館別，將productGm 搜尋結果的id取出
      let gmResultId = [];
      for (let productGm of productGms) {
        for (let product of productGm.Products) {
          gmResultId.push(product.id);
        }
      }
      if (query.dptId > 0 || query.dptSubId > 0 ) {
        gmResultId = [];
        for (let productGm of productGms) {
          let dptPass = true, dptSubPass = true;
          if( query.dptId > 0 ) {
            for (let dptSub of productGm.DptSubs) {
              let dptId = dptSub.DptId;
              if( typeof dptId !== 'undefined' ) {
                if ( dptId != query.dptId ) {
                  dptPass = false;
                }
              }
              else {
                console.log('ProductGmId: ' + productGm.id + ' has not set dpt yet ');
              }
            }
          }
          if (query.dptSubId > 0) {
            for (let dptSub of productGm.DptSubs) {
              let dptSubId = dptSub.id;
              if( typeof dptSubId !== 'undefined' ) {
                if( dptSubId != query.dptSubId )
                  dptSubPass = false;
              }
              else{
                console.log('ProductGmId: ' + productGm.id + ' has not set dptSub yet ');
              }
            }
          }
          if(dptPass && dptSubPass) {
            for (let gmProduct of productGm.Products) {
              gmResultId.push(gmProduct.id);
            }
          }
        }
      }

      // ============== debug console.log block ==============
      // let ttt = [];
      // for (let product of products) {
      //   ttt.push(product.id);
      // }
      // console.log('========== product queryObj =========');
      // console.log(queryObj);
      // console.log('========== product id array =========');
      // console.log(ttt);
      // console.log('========== product gmId array =========');
      // console.log(gmResultId);
      // =========== End of debug console.log block ===========

      // productGm 搜尋結果 與 product 搜尋結果 mapping
      let mappingResult = [];
      for (let product of products) {
        if (gmResultId.indexOf(product.id) != -1) {
          mappingResult.push(product);
        }
      }

      products = mappingResult;

      // name filter
      if(query.name) {
        products = [];
        for (let product of mappingResult) {
          // initial name & gmName
          if( typeof product.ProductGm.name === 'undefined' || product.ProductGm.name === null )
            product.ProductGm.name = '';
          if( typeof product.name === 'undefined' || product.name === null)
            product.name = '';

          // search in name & gmName
          if( (product['name'].search(query.name) != -1 ) || (product['ProductGm']['name'].search(query.name) != -1 ) )
            products.push(product);
        }
      }
      // console.log('========== product array after name filter =========');
      // console.log(JSON.stringify(products, null, 4));

      // format datetime
      products = products.map(ProductService.withImage);
      for (let product of products) {
        product.createdAt = moment(product.createdAt).format("YYYY/MM/DD");
      }

      resultProducts = products;

    } catch (error) {
      console.error(error.stack);
      // let msg = error.message;
      // return res.serverError({msg});
    }
    return {rows: resultProducts, count: resultProducts.length };
  }
};
