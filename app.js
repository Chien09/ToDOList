
/*
Creating multiple to-do list version 2 web app 
and will be hosting it on Heroku and using cloud database MongoDB Atlas.
So the Heroku will communicate with MonogDB Atlas for database for the application. 

-Include npm --> npm init

-Install Express framework --> npm install express

-Install body-parser --> npm install body-parser

-Install EJS template (allow JavaScript code in html file) --> npm install ejs 
    Purpose of EJS template is when there are similar html pages thats needs to be created, with EJS
    you can simply just create one template page for use. HOWEVER, you need to create a folder called
    "views" where the EJS templates will be located and be used.
    
    **IMPORTANT** It is better to include JavaScript (if-else, for loop....) logic code in js file instead of in html, so 
    choose wisely when to use EJS syntax 

    **Reference for EJS use with EXPRESS**
    https://github.com/mde/ejs/wiki/Using-EJS-with-Express
    https://ejs.co/#docs

-Install Mongoose --> npm install mongoose 

-Install Lodash
-->Install Lodash (an external package allowing to deal with route params made easier) --> npm install lodash
https://lodash.com

-run server with --> nodemon app.js  --> on web browser type "localhost:3000"

-DEPLOY app on Heroku (Needs to have .git files in same project folder or install git repository command--> git init)
--> touch Procfile   //and add the code "web: node app.js" into the file 
--> heroku create       //create a heroku app for your app to be deployed 
--> specify the version node.js using in the "package.json" file
"engines": {
    "node": "14.x.x"
  },
--> create .gitignore to ignore files that do not need to be uploaded to respository or deployed
--> git add .  //add project files to staging 
--> git commit -m "Upload Project toDoList"
--> git push heroku main     //deploy app , after you made code changes also do this to push the new updated codes 
--> heroku logs   //to see the app build logs and deploy logs including https connections fails if any

https://enigmatic-plateau-74212.herokuapp.com/ --> this is the deployed web app link

*/

const express = require("express");
const app = express(); 

const bodyParser = require("body-parser"); 
app.use(bodyParser.urlencoded({extended: true}));

const mongoose = require("mongoose"); 

//connect to MongoDB server, and create or look for and link to the 'toDoListDB' 
//mongoose.connect('mongodb://localhost:27017/toDoListDB');  //uncomment this for local DB use 
//connect to MongoDB Atlas cloud DB
//Note: Password is needed, and user name
mongoose.connect("mongodb+srv://<userName>:<password>@cluster0.jth7j.mongodb.net/toDoListDB");  

//create schema
const itemsSchema = new mongoose.Schema({
    name: String
}); 

//model, creating a new collection and follow the itemsSchema requirment 
//"Item" will be automatically change name into "items" when collection stored
//EXAMPLE if it is --> const Person = mongoose.model("Person", personSchema) 
//then it will automatically be stored as "people" collection 
const Item = mongoose.model("Item", itemsSchema); 

const item1 = new Item({
    name: "Test item1"
});

const item2 = new Item({
    name: "Test item2"
});

const defaultItems = [item1, item2]; 

//this is for when there are different types of toDoList like work, home, ...
const listSchema = {
    name: String,
    items: [itemsSchema] 
};

const List = mongoose.model("List", listSchema); 

//when sendFile/render... response also include CSS, images, or other assets in your "public" folder 
app.use(express.static("public")); 

//using EJS template, NEED to create a new folder called "views" where it will look for the template to use
app.set('view engine', 'ejs');

//Lodash 
const _ = require('lodash');

//creater server and listening at port 3000, but we want to deploy this web application on Heroku so we need to port
//at "process.env.PORT" per Heroku requirments, which is a dynamic port that Heroku uses
app.listen(process.env.PORT || 3000, function(){
    console.log("Server up and running ... Listening at port 3000");
}); 

//process GET request from client when access homepage of server
app.get("/", function(request, response){

    //search/fetch data in DB
    Item.find(function(err, items){
        if(err){
            console.log(err);
        } else{
            //console.log(items); 

            if(items.length === 0){
                //insert test data to DB
                Item.insertMany(defaultItems, function(err){
                    if(err){
                        console.log(err);
                    } else{
                        console.log("Successfully saved deafult test items to DB!"); 
                    }
                });

                response.redirect("/"); //to call the render() code below else block
            }else{
                //must use render() for EJS, will look for the index.ejs in folder "views" and then pass the variables
                response.render("index", {listTitle: "Today", newListItems: items}); 
            }
        }
    }); 

}); 


//process add item POST data from client <form></form>
app.post("/", function(request, response){

    //console.log(request.body); 

    const itemName = request.body.newItem; 
    const listName = request.body.typeOfList; 

    const item = new Item({
        name: itemName
    });

    if(listName === "Today"){ 
        //Use default list 

        //insert item into DB
        item.save();

        //rediect to make the item display on list 
        response.redirect("/"); 
    } else { 
        // look for customList 
        List.findOne({name: listName}, function(err, foundList){
            if(!err){
                //add that new item to that customList 
                foundList.items.push(item);
                foundList.save(); 
                response.redirect("/" + listName); 
            }
        });
    }

});

//process delete item POST data from client <form></form>
app.post("/delete", function(request, response){
    //console.log(resquest.body.checkbox); 
    const checkedItemID = request.body.checkbox;  //id of item in DB
    const listName = request.body.listName; 

    //check to delete item from default list or custom List
    if(listName === "Today"){
        //delete item in DB 
        Item.findByIdAndRemove(checkedItemID, function(err){
            if(!err){
                console.log("Successfully deleted checked Item!"); 
            }
        });

        //redirect so the checked item does not display, which is deleted from DB
        response.redirect("/"); 
    } else{ //custom List delete item 

        //Reference to Delete item in document in an array 
        //https://stackoverflow.com/questions/14763721/mongoose-delete-array-element-in-document-and-save

        //delete item from items array of the custom List 
        List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemID}}}, function(err, foundList){
            if(!err){
                response.redirect("/" + listName); 
            }
        }); 

    }

});

//Route Parameters, which allows dynamic creation of routes for the different types of toDoList 
app.get("/:customListName", function(request, response){
    //console.log(request.params.customListName); 
    const customListName = _.capitalize(request.params.customListName); 

    //search if List already exist in DB
    List.findOne({name: customListName}, function(err, foundList){
        if(!err){
            if(!foundList){
                //create a new list 
                console.log("List doesn't exist!");

                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
            
                //insert toDo List into DB
                list.save(); 

                //redirect to display the new List, this will call else block below 
                response.redirect("/" + customListName);

            } else{
                //show existing list 
                console.log("List exists!"); 

                response.render("index", {listTitle: foundList.name, newListItems: foundList.items}); 
            }
        }
    });

});


//process GET request from client when access "/about" of server 
app.get("/about", function(request, response){
    response.render("about"); 
});